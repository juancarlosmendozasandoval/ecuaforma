'use server';

import { revalidatePath } from 'next/cache';
import type { SupabaseClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { validarConfigDinamica, type ConfigDinamica } from '@/lib/simuladores/configDinamica';

type Resultado<T = object> = ({ ok: true } & T) | { ok: false; mensaje: string };

export type DatosCrearSimulador = ConfigDinamica & {
  nombre: string;
  institucion: string;
  categoria: string;
  materia: string;
  publico: boolean;
};

export type DatosEditarSimulador = ConfigDinamica & {
  nombre: string;
  slug: string;
  categoria: string;
  materia: string;
  es_pago: boolean;
  precio: number | string;
};

function limpiarSlug(texto: string) {
  return texto
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9-_\s]/g, '')
    .replace(/[\s-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function mensajeError(codigo: string | undefined, porDefecto: string) {
  if (codigo === '23505') return 'Esa URL (Slug) ya existe en otro simulador.';
  if (codigo === '23514') return 'La configuración dinámica no es válida (revisa temas y cantidad).';
  return porDefecto;
}

/** Valida la configuración y confirma que todos los temas existen. */
async function configValidada(
  supabase: SupabaseClient,
  datos: Partial<ConfigDinamica>
): Promise<{ ok: true; datos: ConfigDinamica } | { ok: false; mensaje: string }> {
  const validacion = validarConfigDinamica(datos || {});
  if (!validacion.ok || !validacion.datos.es_dinamico) return validacion;

  const { count, error } = await supabase
    .from('temas')
    .select('id', { count: 'exact', head: true })
    .in('id', validacion.datos.temas_dinamicos);
  if (error) return { ok: false, mensaje: 'No se pudieron verificar los temas.' };
  if (count !== validacion.datos.temas_dinamicos.length) {
    return { ok: false, mensaje: 'Alguno de los temas seleccionados ya no existe.' };
  }
  return validacion;
}

export async function crearSimulador(datos: DatosCrearSimulador): Promise<Resultado<{ slug: string; es_dinamico: boolean }>> {
  const { supabase } = await requireAdmin();

  const nombre = (datos?.nombre || '').trim();
  const institucion = (datos?.institucion || '').trim();
  if (!nombre || !institucion) return { ok: false, mensaje: 'El nombre y la institución son obligatorios.' };
  const slug = limpiarSlug(nombre);
  if (!slug) return { ok: false, mensaje: 'El nombre debe tener letras o números.' };

  const config = await configValidada(supabase, datos);
  if (!config.ok) return config;

  const { data, error } = await supabase
    .from('simuladores')
    .insert({
      nombre,
      slug,
      institucion,
      categoria: (datos.categoria || '').trim(),
      materia: (datos.materia || '').trim(),
      publico: !!datos.publico,
      ...config.datos,
    })
    .select('slug, es_dinamico')
    .single();

  if (error || !data) return { ok: false, mensaje: mensajeError(error?.code, 'No se pudo crear el simulador.') };

  revalidatePath('/admin/simuladores');
  return { ok: true, slug: data.slug || slug, es_dinamico: !!data.es_dinamico };
}

export async function actualizarSimulador(id: string, datos: DatosEditarSimulador): Promise<Resultado> {
  const { supabase } = await requireAdmin();

  const nombre = (datos?.nombre || '').trim();
  const slug = limpiarSlug(datos?.slug || '');
  if (!id || !nombre || !slug) return { ok: false, mensaje: 'El nombre y la URL no pueden estar vacíos.' };

  const precio = datos.es_pago ? Number(datos.precio) : 0;
  if (!Number.isFinite(precio) || precio < 0) return { ok: false, mensaje: 'El precio no es válido.' };

  const config = await configValidada(supabase, datos);
  if (!config.ok) return config;

  const { error } = await supabase
    .from('simuladores')
    .update({
      nombre,
      slug,
      categoria: (datos.categoria || '').trim(),
      materia: (datos.materia || '').trim(),
      es_pago: !!datos.es_pago,
      precio,
      ...config.datos,
    })
    .eq('id', id);

  if (error) return { ok: false, mensaje: mensajeError(error.code, 'Error al actualizar el simulador.') };

  revalidatePath('/admin/simuladores');
  return { ok: true };
}
