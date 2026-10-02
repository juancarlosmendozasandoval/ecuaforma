import 'server-only';
import { plantillaBienvenida } from '@/lib/email/bienvenida';
import { sendEmail } from '@/lib/email/sendEmail';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Bienvenida tras un pago aprobado. No bloquea ni hace fallar la confirmación:
 * el cobro y la matrícula ya quedaron guardados.
 */
export function avisarBienvenidaPago(usuarioId: string, cursoId: string) {
  void (async () => {
    try {
      const admin = createAdminClient();
      const [{ data: usuario }, { data: curso }] = await Promise.all([
        admin.auth.admin.getUserById(usuarioId),
        admin.from('cursos').select('nombre').eq('id', cursoId).maybeSingle(),
      ]);
      const email = usuario.user?.email || '';
      if (!email) {
        console.error('[PAGO] Bienvenida sin enviar: el alumno no tiene correo.');
        return;
      }
      await sendEmail(email, '¡Bienvenido a Ecuaforma!', plantillaBienvenida(curso?.nombre || ''));
    } catch (error) {
      console.error('[PAGO] No se pudo enviar la bienvenida:', error instanceof Error ? error.message : error);
    }
  })();
}
