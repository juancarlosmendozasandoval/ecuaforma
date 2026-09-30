import { NextResponse, type NextRequest } from 'next/server';
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { esAdmin } from '@/lib/auth/adminEmail';

/**
 * Primera barrera de /admin: cualquier petición de alguien que no sea el
 * administrador se redirige a "/" antes de renderizar nada.
 * Requiere next >= 14.2.25 (CVE-2025-29927, bypass de middleware).
 */
export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !esAdmin(user.email)) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  // Devolver `res` conserva las cookies de sesión refrescadas por Supabase
  return res;
}

export const config = {
  matcher: ['/admin/:path*'],
};
