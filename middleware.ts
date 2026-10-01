import { NextResponse, type NextRequest } from 'next/server';
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { esAdmin } from '@/lib/auth/adminEmail';

/**
 * Refresca la sesión y devuelve la MISMA respuesta que recibió el cliente
 * de Supabase. Si se devuelve otro objeto, las cookies nuevas se pierden.
 */
export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  await supabase.auth.getSession();

  if (req.nextUrl.pathname.startsWith('/admin')) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !esAdmin(user.email)) {
      const destino = NextResponse.redirect(new URL('/', req.url));
      res.headers.getSetCookie().forEach((cookie) => {
        destino.headers.append('set-cookie', cookie);
      });
      return destino;
    }
  }

  return res;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|auth/callback|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
