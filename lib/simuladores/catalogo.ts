import 'server-only';
import { cache } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/admin';
import { slugify } from '@/lib/texto/slug';

/**
 * Catálogo público de simuladores en dos niveles:
 * /simuladores/[institucion]/[slug de la materia].
 */

export type MateriaCatalogo = { id: string; nombre: string; slug: string; orden: number };

export const INSTITUCIONES_BASE = ['FAE', 'Armada', 'Ejército', 'Policía'];

const ALIAS_INSTITUCION: Record<string, string> = {
  fae: 'FAE',
  armada: 'Armada',
  ejercito: 'Ejército',
  'ejército': 'Ejército',
  policia: 'Policía',
  'policía': 'Policía',
};

/** Segmento de URL ("ejercito", "Universidad%20de%20Guayaquil") → nombre guardado en la BD. */
export function nombreInstitucion(segmento: string) {
  const decodificado = decodeURIComponent(segmento || '');
  return ALIAS_INSTITUCION[decodificado.toLowerCase()] || decodificado;
}

/**
 * Materias con su slug. Son datos públicos (nombres de asignaturas); se leen
 * con el cliente de servidor para no depender de políticas RLS de lectura.
 */
export const cargarMateriasCatalogo = cache(async (): Promise<MateriaCatalogo[]> => {
  const { data, error } = await createAdminClient()
    .from('materias')
    .select('id, nombre, slug, orden')
    .order('orden')
    .order('nombre');
  if (error) {
    console.error('No se pudieron cargar las materias del catálogo:', error.message);
    return [];
  }
  return (data || []) as MateriaCatalogo[];
});

/**
 * Busca la materia por slug. Acepta también URLs antiguas que usaban el nombre
 * de la categoría ("Matemática" → "matematicas"); `canonica` indica si hay que redirigir.
 */
export function resolverMateria(segmento: string, materias: MateriaCatalogo[]) {
  const decodificado = decodeURIComponent(segmento || '');
  const clave = slugify(decodificado);
  if (!clave) return null;

  const exacta = materias.find((materia) => materia.slug === decodificado);
  if (exacta) return { materia: exacta, canonica: true };

  const parecida =
    materias.find((materia) => materia.slug === clave || slugify(materia.nombre) === clave) ||
    materias.find((materia) => `${clave}s` === materia.slug || clave === `${materia.slug}s`);
  return parecida ? { materia: parecida, canonica: false } : null;
}

/** Ids de simuladores privados a los que el usuario tiene acceso directo. */
export async function simuladoresAccesibles(supabase: SupabaseClient, usuarioId: string | undefined) {
  if (!usuarioId) return [];
  const { data } = await supabase.from('accesos_simuladores').select('simulador_id').eq('usuario_id', usuarioId);
  return (data || []).map((fila) => fila.simulador_id as string);
}

/** Filtro de visibilidad: públicos, o privados con acceso directo. */
export function filtroVisibilidad(accesibles: string[]) {
  return accesibles.length > 0 ? `publico.eq.true,id.in.(${accesibles.join(',')})` : 'publico.eq.true';
}

export function hrefMateria(institucion: string | null | undefined, materia: MateriaCatalogo) {
  return `/simuladores/${encodeURIComponent(institucion || '')}/${materia.slug}`;
}
