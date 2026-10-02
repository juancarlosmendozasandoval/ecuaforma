import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';

export type EstadisticasLanding = {
  preguntas: number;
  simuladores: number;
  cursos: number;
  intentos: number;
};

/**
 * Cifras reales para la prueba social de la portada. Solo conteos, sin datos
 * de alumnos. Si la consulta falla, la sección muestra textos sin números.
 */
export async function cargarEstadisticasLanding(): Promise<EstadisticasLanding | null> {
  try {
    const admin = createAdminClient();
    const [preguntas, simuladores, cursos, intentos] = await Promise.all([
      admin.from('preguntas').select('id', { count: 'exact', head: true }),
      admin.from('simuladores').select('id', { count: 'exact', head: true }).eq('is_deleted', false),
      admin.from('cursos').select('id', { count: 'exact', head: true }).eq('is_deleted', false),
      admin.from('historial_simuladores').select('id', { count: 'exact', head: true }),
    ]);

    return {
      preguntas: preguntas.count || 0,
      simuladores: simuladores.count || 0,
      cursos: cursos.count || 0,
      intentos: intentos.count || 0,
    };
  } catch (error) {
    console.error('No se pudieron cargar las cifras de la portada:', error instanceof Error ? error.message : error);
    return null;
  }
}
