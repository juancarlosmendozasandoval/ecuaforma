import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'
import { COOKIE_DESTINO_LOGIN, destinoSeguro } from '@/lib/auth/destinoLogin'

/** Pega en la redirección las cookies de sesión que escribió Supabase. */
function conCookiesDeSesion(destino: NextResponse) {
  cookies().getAll().forEach((cookie) => {
    if (!cookie.name.startsWith('sb-')) return
    destino.cookies.set({
      name: cookie.name,
      value: cookie.value,
      path: '/',
      sameSite: 'lax',
    })
  })
  return destino
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')
  const origen = request.nextUrl.origin

  if (!code) {
    console.error('🔥 Error en Callback de Auth:', 'La URL no trae el parámetro code')
    return NextResponse.redirect(new URL('/', origen))
  }

  const supabase = createRouteHandlerClient({ cookies })
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    console.error('🔥 Error en Callback de Auth:', error)
    return NextResponse.redirect(new URL('/', origen))
  }

  const destino =
    destinoSeguro(request.nextUrl.searchParams.get('next')) ||
    destinoSeguro(decodificar(request.cookies.get(COOKIE_DESTINO_LOGIN)?.value)) ||
    '/mis-cursos'

  const respuesta = conCookiesDeSesion(NextResponse.redirect(new URL(destino, origen)))
  respuesta.cookies.set({ name: COOKIE_DESTINO_LOGIN, value: '', path: '/', maxAge: 0 })
  return respuesta
}

function decodificar(valor: string | undefined) {
  if (!valor) return null
  try {
    return decodeURIComponent(valor)
  } catch {
    return null
  }
}
