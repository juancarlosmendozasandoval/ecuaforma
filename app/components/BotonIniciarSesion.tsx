'use client';

import { useSupabase } from './AuthProvider';
import { COOKIE_DESTINO_LOGIN, destinoSeguro } from '@/lib/auth/destinoLogin';

/**
 * Mismo inicio de sesión que el Navbar: Google OAuth.
 * Tras el login, /auth/callback devuelve al usuario a la página donde hizo clic.
 */
export default function BotonIniciarSesion({ className, children }: { className?: string; children: React.ReactNode }) {
  const { supabase } = useSupabase();

  const handleLogin = async () => {
    const destino = destinoSeguro(`${window.location.pathname}${window.location.search}`) || '/';
    document.cookie = `${COOKIE_DESTINO_LOGIN}=${encodeURIComponent(destino)}; path=/; max-age=600; samesite=lax`;

    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(destino)}`,
      },
    });
  };

  return (
    <button type="button" onClick={handleLogin} className={className}>
      {children}
    </button>
  );
}
