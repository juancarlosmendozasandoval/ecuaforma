import 'server-only';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { esAdmin } from './adminEmail';

/**
 * Exige que el usuario actual sea el administrador; si no, redirige a "/".
 * Usar al inicio de cada layout/página de /admin que sea Server Component:
 * el middleware es la primera barrera, esta la segunda.
 */
export async function requireAdmin() {
  const cookieStore = cookies();
  const supabase = createServerComponentClient({ cookies: () => cookieStore });

  // getUser() valida el token contra Supabase Auth (getSession() no lo hace)
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !esAdmin(user.email)) redirect('/');

  return { supabase, user };
}
