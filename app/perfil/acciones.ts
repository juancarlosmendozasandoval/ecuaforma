'use server';

import { cookies } from 'next/headers';
import { createServerActionClient } from '@supabase/auth-helpers-nextjs';
import { esAdmin } from '@/lib/auth/adminEmail';
import { CONTACTO_LEGAL } from '@/lib/legales/documentos';
import { createAdminClient } from '@/lib/supabase/admin';

type Resultado = { ok: true } | { ok: false; mensaje: string };

/** Texto que el usuario debe escribir en el modal para confirmar el borrado. */
const CONFIRMACION_REQUERIDA = 'ELIMINAR';

/**
 * Derecho de eliminación (LOPDP): borra la identidad del usuario actual en Supabase Auth.
 * Las tablas con FK a `auth.users` borran sus filas en cascada; `pagos` conserva el
 * registro contable con `usuario_id` en null.
 */
export async function eliminarCuentaUsuario(confirmacion: string): Promise<Resultado> {
  const cookieStore = cookies();
  const supabase = createServerActionClient({ cookies: () => cookieStore });

  // getUser() valida el token con Supabase Auth: el id nunca sale del cliente.
  const { data: { user }, error: errorSesion } = await supabase.auth.getUser();
  if (errorSesion || !user) return { ok: false, mensaje: 'Tu sesión expiró. Vuelve a iniciar sesión.' };

  if ((confirmacion || '').trim().toUpperCase() !== CONFIRMACION_REQUERIDA) {
    return { ok: false, mensaje: `Escribe ${CONFIRMACION_REQUERIDA} para confirmar.` };
  }

  if (esAdmin(user.email)) {
    return { ok: false, mensaje: 'La cuenta administradora no se puede eliminar desde el perfil.' };
  }

  const { error } = await createAdminClient().auth.admin.deleteUser(user.id);
  if (error) {
    console.error('[CUENTA] No se pudo eliminar el usuario', user.id, error.message);
    return {
      ok: false,
      mensaje: `No pudimos eliminar tu cuenta. Inténtalo de nuevo o escríbenos a ${CONTACTO_LEGAL.email}.`,
    };
  }

  // El usuario ya no existe: solo se limpian las cookies de sesión locales.
  await supabase.auth.signOut({ scope: 'local' });
  return { ok: true };
}
