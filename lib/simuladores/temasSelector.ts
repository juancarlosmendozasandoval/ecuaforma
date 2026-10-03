import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { INSTITUCIONES_BASE } from './catalogo';
import type { MateriaSelector, TemaSelector } from './configDinamica';

type FilaTema = {
  id: string;
  nombre: string | null;
  orden: number | null;
  materia_id: string;
  materias: { nombre: string | null; orden: number | null } | { nombre: string | null; orden: number | null }[] | null;
  preguntas?: { count: number }[] | null;
};

/**
 * Temas ordenados por materia, con el tamaño de su banco de preguntas.
 * Si el conteo embebido falla, devuelve los temas sin conteo.
 */
export async function cargarTemasSelector(supabase: SupabaseClient): Promise<TemaSelector[]> {
  const base = 'id, nombre, orden, materia_id, materias(nombre, orden)';
  let { data, error } = await supabase.from('temas').select(`${base}, preguntas(count)`);
  if (error) ({ data, error } = await supabase.from('temas').select(base));
  if (error) return [];

  return ((data || []) as FilaTema[])
    .map((fila) => {
      const materia = Array.isArray(fila.materias) ? fila.materias[0] : fila.materias;
      return {
        tema: {
          id: fila.id,
          nombre: fila.nombre || 'Sin nombre',
          materia_id: fila.materia_id,
          materia: materia?.nombre || 'Sin materia',
          preguntas: fila.preguntas ? fila.preguntas[0]?.count ?? 0 : null,
        },
        ordenMateria: materia?.orden ?? 0,
        orden: fila.orden ?? 0,
      };
    })
    .sort(
      (a, b) =>
        a.ordenMateria - b.ordenMateria ||
        a.tema.materia.localeCompare(b.tema.materia, 'es') ||
        a.orden - b.orden ||
        a.tema.nombre.localeCompare(b.tema.nombre, 'es')
    )
    .map((fila) => fila.tema);
}

/** Materias de la tabla `materias`, en el orden definido en Categorías. */
export async function cargarMateriasSelector(supabase: SupabaseClient): Promise<MateriaSelector[]> {
  const { data, error } = await supabase.from('materias').select('id, nombre').order('orden').order('nombre');
  if (error) return [];
  return ((data || []) as { id: string; nombre: string | null }[]).map((fila) => ({
    id: fila.id,
    nombre: fila.nombre || 'Sin nombre',
  }));
}

/** Instituciones base más las que ya usan los simuladores existentes. */
export async function cargarInstituciones(supabase: SupabaseClient): Promise<string[]> {
  const { data } = await supabase.from('simuladores').select('institucion').eq('is_deleted', false);
  return Array.from(new Set([...INSTITUCIONES_BASE, ...(data || []).map((fila) => fila.institucion || '')]))
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, 'es'));
}
