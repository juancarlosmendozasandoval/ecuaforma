'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import type { Tables } from '@/types/supabase';

type Resultado<T = object> = ({ ok: true } & T) | { ok: false; mensaje: string };

export type DatosCrearCarpeta = {
  cursoId: string;
  titulo: string;
  /** `null` crea un módulo principal; un id crea un submódulo dentro de ese módulo. */
  parentId: string | null;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_TITULO = 150;

/**
 * Crea un módulo principal o un submódulo al final de sus hermanos.
 * Solo existen dos niveles: el padre debe ser un módulo principal del mismo curso.
 */
export async function crearCarpeta(datos: DatosCrearCarpeta): Promise<Resultado<{ modulo: Tables<'modulos_curso'> }>> {
  const { supabase } = await requireAdmin();

  const titulo = (datos.titulo || '').trim();
  const parentId = datos.parentId || null;

  if (!UUID.test(datos.cursoId || '')) return { ok: false, mensaje: 'Curso no válido.' };
  if (!titulo) return { ok: false, mensaje: 'Escribe un nombre para la carpeta.' };
  if (titulo.length > MAX_TITULO) return { ok: false, mensaje: `El nombre admite hasta ${MAX_TITULO} caracteres.` };
  if (parentId && !UUID.test(parentId)) return { ok: false, mensaje: 'Módulo principal no válido.' };

  if (parentId) {
    const { data: padre } = await supabase
      .from('modulos_curso')
      .select('id, curso_id, parent_id')
      .eq('id', parentId)
      .maybeSingle();

    if (!padre || padre.curso_id !== datos.cursoId) {
      return { ok: false, mensaje: 'El módulo principal no pertenece a este curso.' };
    }
    if (padre.parent_id) return { ok: false, mensaje: 'Un submódulo no puede contener otros submódulos.' };
  }

  const hermanos = supabase.from('modulos_curso').select('orden').eq('curso_id', datos.cursoId);
  const { data: ultimo } = await (parentId ? hermanos.eq('parent_id', parentId) : hermanos.is('parent_id', null))
    .order('orden', { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: modulo, error } = await supabase
    .from('modulos_curso')
    .insert({ curso_id: datos.cursoId, titulo, parent_id: parentId, orden: (ultimo?.orden || 0) + 1 })
    .select('*')
    .single();

  if (error || !modulo) {
    console.error('Error al crear la carpeta:', error);
    return { ok: false, mensaje: error?.code === 'P0001' ? error.message : 'No se pudo crear la carpeta.' };
  }

  revalidatePath('/admin/cursos', 'layout');
  return { ok: true, modulo };
}

type ClienteAdmin = Awaited<ReturnType<typeof requireAdmin>>['supabase'];
type CarpetaBase = Pick<Tables<'modulos_curso'>, 'id' | 'curso_id' | 'parent_id' | 'orden' | 'titulo'>;

async function leerCarpeta(supabase: ClienteAdmin, id: string): Promise<CarpetaBase | null> {
  if (!UUID.test(id || '')) return null;
  const { data } = await supabase
    .from('modulos_curso')
    .select('id, curso_id, parent_id, orden, titulo')
    .eq('id', id)
    .maybeSingle();
  return (data as CarpetaBase | null) || null;
}

/** Cambia el nombre de un módulo principal o de un submódulo. */
export async function editarCarpeta(id: string, nuevoTitulo: string): Promise<Resultado<{ titulo: string }>> {
  const { supabase } = await requireAdmin();

  const titulo = (nuevoTitulo || '').trim();
  if (!titulo) return { ok: false, mensaje: 'Escribe un nombre para la carpeta.' };
  if (titulo.length > MAX_TITULO) return { ok: false, mensaje: `El nombre admite hasta ${MAX_TITULO} caracteres.` };

  const carpeta = await leerCarpeta(supabase, id);
  if (!carpeta) return { ok: false, mensaje: 'La carpeta no existe.' };

  const { error } = await supabase.from('modulos_curso').update({ titulo }).eq('id', id);
  if (error) {
    console.error('Error al renombrar la carpeta:', error);
    return { ok: false, mensaje: 'No se pudo renombrar la carpeta.' };
  }

  revalidatePath('/admin/cursos', 'layout');
  return { ok: true, titulo };
}

/**
 * Elimina una carpeta vacía. Un módulo principal con submódulos o una carpeta
 * con lecciones se rechazan para no borrar contenido en cascada por accidente.
 */
export async function eliminarCarpeta(id: string): Promise<Resultado> {
  const { supabase } = await requireAdmin();

  const carpeta = await leerCarpeta(supabase, id);
  if (!carpeta) return { ok: false, mensaje: 'La carpeta no existe.' };

  const [{ count: hijos, error: errorHijos }, { count: lecciones, error: errorLecciones }] = await Promise.all([
    supabase.from('modulos_curso').select('id', { count: 'exact', head: true }).eq('parent_id', id),
    supabase.from('contenido_modulos').select('id', { count: 'exact', head: true }).eq('modulo_id', id),
  ]);

  if (errorHijos || errorLecciones) {
    console.error('Error al revisar la carpeta:', errorHijos || errorLecciones);
    return { ok: false, mensaje: 'No se pudo comprobar el contenido de la carpeta.' };
  }
  if ((hijos || 0) > 0) {
    return {
      ok: false,
      mensaje: `"${carpeta.titulo || ''}" tiene ${hijos} submódulo(s). Elimínalos o vacíalos antes de borrar el módulo.`,
    };
  }
  if ((lecciones || 0) > 0) {
    return {
      ok: false,
      mensaje: `"${carpeta.titulo || ''}" tiene ${lecciones} lección(es). Quítalas antes de borrar la carpeta.`,
    };
  }

  const { error } = await supabase.from('modulos_curso').delete().eq('id', id);
  if (error) {
    console.error('Error al eliminar la carpeta:', error);
    return { ok: false, mensaje: 'No se pudo eliminar la carpeta.' };
  }

  revalidatePath('/admin/cursos', 'layout');
  return { ok: true };
}

/**
 * Sube o baja una carpeta un puesto entre sus hermanos (mismo curso y mismo padre).
 * Renumera a los hermanos 1..n para corregir órdenes repetidos o con huecos.
 */
export async function moverCarpeta(
  id: string,
  direccion: 'arriba' | 'abajo'
): Promise<Resultado<{ ordenes: { id: string; orden: number }[] }>> {
  const { supabase } = await requireAdmin();

  const carpeta = await leerCarpeta(supabase, id);
  if (!carpeta || !carpeta.curso_id) return { ok: false, mensaje: 'La carpeta no existe.' };

  const consulta = supabase.from('modulos_curso').select('id, orden').eq('curso_id', carpeta.curso_id);
  const { data: hermanosData, error: errorHermanos } = await (carpeta.parent_id
    ? consulta.eq('parent_id', carpeta.parent_id)
    : consulta.is('parent_id', null)
  )
    .order('orden', { ascending: true })
    .order('created_at', { ascending: true });

  if (errorHermanos || !hermanosData) {
    console.error('Error al leer las carpetas hermanas:', errorHermanos);
    return { ok: false, mensaje: 'No se pudo reordenar la carpeta.' };
  }

  const hermanos = hermanosData as { id: string; orden: number }[];
  const indice = hermanos.findIndex((h) => h.id === id);
  const destino = direccion === 'arriba' ? indice - 1 : indice + 1;
  if (indice < 0 || destino < 0 || destino >= hermanos.length) {
    return { ok: false, mensaje: direccion === 'arriba' ? 'Ya es la primera carpeta.' : 'Ya es la última carpeta.' };
  }

  const reordenados = [...hermanos];
  [reordenados[indice], reordenados[destino]] = [reordenados[destino], reordenados[indice]];
  const ordenes = reordenados.map((h, i) => ({ id: h.id, orden: i + 1 }));

  const cambios = ordenes.filter((o) => hermanos.find((h) => h.id === o.id)?.orden !== o.orden);
  const resultados = await Promise.all(
    cambios.map((o) => supabase.from('modulos_curso').update({ orden: o.orden }).eq('id', o.id))
  );
  const fallo = resultados.find((r) => r.error);
  if (fallo) {
    console.error('Error al reordenar la carpeta:', fallo.error);
    return { ok: false, mensaje: 'No se pudo reordenar la carpeta.' };
  }

  revalidatePath('/admin/cursos', 'layout');
  return { ok: true, ordenes };
}
