import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';

type CursoCobro = { es_pago: boolean | null; precio: number | null };

/** Un curso con precio se cobra aunque `es_pago` haya quedado en false. */
export function esCursoDePago(curso: CursoCobro) {
  return !!curso.es_pago || Number(curso.precio) > 0;
}

/**
 * Matrícula según `accesos_cursos`, leída con el cliente de servidor para
 * que una política RLS mal configurada no cambie la respuesta.
 */
export async function tieneMatricula(usuarioId: string | null | undefined, cursoId: string) {
  if (!usuarioId || !cursoId) return false;

  const { data, error } = await createAdminClient()
    .from('accesos_cursos')
    .select('id')
    .eq('usuario_id', usuarioId)
    .eq('curso_id', cursoId)
    .maybeSingle();

  if (error) {
    console.error('No se pudo verificar la matrícula:', error.code);
    return false;
  }
  return !!data;
}
