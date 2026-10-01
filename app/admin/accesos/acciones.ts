'use server';

import { requireAdmin } from '@/lib/auth/requireAdmin';
import { plantillaBienvenida } from '@/lib/email/bienvenida';
import { sendEmail } from '@/lib/email/sendEmail';
import { createAdminClient } from '@/lib/supabase/admin';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type ResultadoAcceso = { ok: true } | { ok: false; mensaje: string };

export async function inscribirAlumno(usuarioId: string, cursoId: string): Promise<ResultadoAcceso> {
  await requireAdmin();
  if (!UUID.test(usuarioId || '') || !UUID.test(cursoId || '')) {
    return { ok: false, mensaje: 'El alumno o el curso no son válidos.' };
  }

  const admin = createAdminClient();
  const { data: curso } = await admin
    .from('cursos')
    .select('id, nombre')
    .eq('id', cursoId)
    .eq('is_deleted', false)
    .maybeSingle();

  if (!curso) return { ok: false, mensaje: 'Ese curso ya no está disponible.' };

  const { error } = await admin.from('accesos_cursos').insert({
    usuario_id: usuarioId,
    curso_id: cursoId,
  });

  if (error?.code === '23505') {
    return { ok: false, mensaje: 'Este alumno ya está inscrito en ese curso.' };
  }
  if (error) {
    console.error('Error al inscribir alumno:', error.code);
    return { ok: false, mensaje: 'No se pudo inscribir al alumno.' };
  }

  enviarBienvenida(admin, usuarioId, curso.nombre || '');
  return { ok: true };
}

/** El alta ya quedó guardada: el correo no debe retrasar ni tumbar la respuesta. */
function enviarBienvenida(
  admin: ReturnType<typeof createAdminClient>,
  usuarioId: string,
  nombreCurso: string
) {
  const curso = nombreCurso.trim() || 'tu curso';
  void (async () => {
    try {
      const { data, error } = await admin.auth.admin.getUserById(usuarioId);
      const email = data.user?.email || '';
      if (error || !email) {
        console.error('No se envió la bienvenida: el alumno no tiene correo.');
        return;
      }
      await sendEmail(email, '¡Bienvenido a Ecuaforma!', plantillaBienvenida(curso));
    } catch (error) {
      console.error('No se pudo enviar el correo de bienvenida:', error);
    }
  })();
}

export async function revocarAcceso(accesoId: string, usuarioId: string): Promise<ResultadoAcceso> {
  await requireAdmin();
  if (!UUID.test(accesoId || '') || !UUID.test(usuarioId || '')) {
    return { ok: false, mensaje: 'No se pudo identificar la matrícula.' };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from('accesos_cursos')
    .delete()
    .eq('id', accesoId)
    .eq('usuario_id', usuarioId);

  if (error) {
    console.error('Error al revocar matrícula:', error.code);
    return { ok: false, mensaje: 'No se pudo quitar el acceso.' };
  }

  return { ok: true };
}
