import 'server-only';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

/**
 * Exige una sesión válida. Si no hay usuario, redirige a "/".
 * getUser() valida el token contra Supabase Auth.
 */
export async function requireAuth() {
  const cookieStore = cookies();
  const supabase = createServerComponentClient({ cookies: () => cookieStore });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/');
  return { supabase, user };
}
