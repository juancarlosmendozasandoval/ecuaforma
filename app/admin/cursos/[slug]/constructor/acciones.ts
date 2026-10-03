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
