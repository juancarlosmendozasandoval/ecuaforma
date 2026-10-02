import 'server-only';
import { esAdmin } from '@/lib/auth/adminEmail';
import { createAdminClient } from '@/lib/supabase/admin';
import { mapearPreguntasExamen } from './preguntasDeExamen';

type SimuladorAcceso = {
  id: string;
  publico: boolean | null;
  es_pago: boolean | null;
  precio: number | null;
};

type UsuarioAcceso = { id: string; email?: string | null } | null | undefined;

/** Libre solo si es público y no tiene precio. */
export function simuladorEsLibre(simulador: SimuladorAcceso) {
  return !!simulador.publico && !simulador.es_pago && !(Number(simulador.precio) > 0);
}

/**
 * Puede rendirlo el admin, cualquiera si es libre, quien tenga fila en
 * `accesos_simuladores`, o quien esté matriculado en un curso que lo usa
 * como examen de una lección. Se consulta con el cliente de servidor.
 */
export async function puedeRendirSimulador(usuario: UsuarioAcceso, simulador: SimuladorAcceso) {
  if (simuladorEsLibre(simulador)) return true;
  if (!usuario?.id) return false;
  if (esAdmin(usuario.email)) return true;

  const admin = createAdminClient();
  const { data: directo } = await admin
    .from('accesos_simuladores')
    .select('id')
    .eq('usuario_id', usuario.id)
    .eq('simulador_id', simulador.id)
    .maybeSingle();
  if (directo) return true;

  const { data: matriculas } = await admin.from('accesos_cursos').select('curso_id').eq('usuario_id', usuario.id);
  const cursos = (matriculas || []).map((fila) => fila.curso_id);
  if (cursos.length === 0) return false;

  const { data: usos } = await admin
    .from('contenido_modulos')
    .select('id, banco_lecciones!inner(simulador_id), modulos_curso!inner(curso_id)')
    .eq('banco_lecciones.simulador_id', simulador.id)
    .in('modulos_curso.curso_id', cursos)
    .limit(1);
  return (usos || []).length > 0;
}

/** Preguntas con respuestas. Solo llamar después de verificar el acceso. */
export async function cargarPreguntasSimulador<T extends { orden?: number | null }>(simuladorId: string) {
  const { data, error } = await createAdminClient()
    .from('simulador_preguntas')
    .select('orden, preguntas(*)')
    .eq('simulador_id', simuladorId)
    .order('orden', { ascending: true });
  if (error) throw new Error('No se pudieron cargar las preguntas');
  return mapearPreguntasExamen<T>(data);
}
