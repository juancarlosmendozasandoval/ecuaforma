import 'server-only';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

/**
 * Exige una sesión válida. Si no hay usuario, redirige a "/".
 * getUser() valida el token contra Supabase Auth.
 */
export async function requireAuth() {
  // Next.js 14.2: cookies() es síncrono. auth-helpers lo llama sin await.
  const cookieStore = cookies();
  const supabase = createServerComponentClient({ cookies: () => cookieStore });
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    console.log('Error en requireAuth:', error);
    redirect('/');
  }

  return { supabase, user };
}
