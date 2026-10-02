import { NextResponse, type NextRequest } from 'next/server';
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { esAdmin } from '@/lib/auth/adminEmail';

/**
 * Refresca la sesión y devuelve la MISMA respuesta que recibió el cliente
 * de Supabase. Si se devuelve otro objeto, las cookies nuevas se pierden.
 *
 * `getUser()` valida el token contra Supabase Auth y, si el access token
 * expiró, lo renueva y escribe las cookies nuevas en `res`.
 */
export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const esAdminRuta = req.nextUrl.pathname.startsWith('/admin');

  // Los prefetch de <Link> no necesitan renovar la sesión: lo hará la
  // navegación real. Así se ahorran llamadas a Supabase Auth (límite 429).
  if (!esAdminRuta && req.headers.get('next-router-prefetch')) {
    return res;
  }

  const supabase = createMiddlewareClient({ req, res });
  const { data: { user } } = await supabase.auth.getUser();

  if (esAdminRuta && (!user || !esAdmin(user.email))) {
    const destino = NextResponse.redirect(new URL('/', req.url));
    res.headers.getSetCookie().forEach((cookie) => {
      destino.headers.append('set-cookie', cookie);
    });
    return destino;
  }

  return res;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|auth/callback|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
