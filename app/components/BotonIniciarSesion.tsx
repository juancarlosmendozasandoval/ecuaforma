'use client';

import { useSupabase } from './AuthProvider';

/**
 * Mismo inicio de sesión que el Navbar: Google OAuth.
 * No hay página /login ni /auth; el retorno es la ruta relativa /auth/callback.
 */
export default function BotonIniciarSesion({ className, children }: { className?: string; children: React.ReactNode }) {
  const { supabase } = useSupabase();

  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  return (
    <button type="button" onClick={handleLogin} className={className}>
      {children}
    </button>
  );
}
