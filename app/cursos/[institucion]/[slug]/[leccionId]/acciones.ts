'use server';

import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { tieneMatricula } from '@/lib/cursos/acceso';
import { cargarPreguntasSimulador } from '@/lib/simuladores/acceso';
import { createAdminClient } from '@/lib/supabase/admin';
import type { QuestionType, SimulatorType } from '../../../../simulador/[slug]/page';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type ExamenLeccion =
  | { ok: true; sim: SimulatorType; pregs: QuestionType[] }
  | { ok: false; mensaje: string };

/**
 * Examen de una lección del aula. El simulador sale de la lección guardada en
 * el curso, nunca del navegador, y solo se entrega a quien está matriculado.
 */
export async function cargarExamenLeccion(contenidoId: string): Promise<ExamenLeccion> {
  if (!UUID.test(contenidoId || '')) return { ok: false, mensaje: 'Lección no válida.' };

  const cookieStore = cookies();
  const supabase = createServerComponentClient({ cookies: () => cookieStore });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, mensaje: 'Inicia sesión para rendir el examen.' };

  const admin = createAdminClient();
  const { data: contenido } = await admin
    .from('contenido_modulos')
    .select('id, modulos_curso(curso_id), banco_lecciones(simulador_id)')
    .eq('id', contenidoId)
    .maybeSingle();

  const modulo = Array.isArray(contenido?.modulos_curso) ? contenido?.modulos_curso[0] : contenido?.modulos_curso;
  const banco = Array.isArray(contenido?.banco_lecciones) ? contenido?.banco_lecciones[0] : contenido?.banco_lecciones;
  const cursoId = modulo?.curso_id || '';
  const simuladorId = banco?.simulador_id || '';
  if (!cursoId || !simuladorId) return { ok: false, mensaje: 'Esta lección no tiene examen.' };

  if (!(await tieneMatricula(user.id, cursoId))) {
    return { ok: false, mensaje: 'Necesitas estar inscrito en el curso para rendir este examen.' };
  }

  const { data: sim } = await admin
    .from('simuladores')
    .select('*')
    .eq('id', simuladorId)
    .eq('is_deleted', false)
    .maybeSingle();
  if (!sim) return { ok: false, mensaje: 'El examen ya no está disponible.' };

  const pregs = await cargarPreguntasSimulador<QuestionType>(sim);
  return { ok: true, sim: sim as SimulatorType, pregs };
}
