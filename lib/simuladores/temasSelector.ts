import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { TemaSelector } from './configDinamica';

type FilaTema = {
  id: string;
  nombre: string | null;
  orden: number | null;
  materias: { nombre: string | null; orden: number | null } | { nombre: string | null; orden: number | null }[] | null;
  preguntas?: { count: number }[] | null;
};

/**
 * Temas ordenados por materia, con el tamaño de su banco de preguntas.
 * Si el conteo embebido falla, devuelve los temas sin conteo.
 */
export async function cargarTemasSelector(supabase: SupabaseClient): Promise<TemaSelector[]> {
  const base = 'id, nombre, orden, materias(nombre, orden)';
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
