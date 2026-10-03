'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, Loader2, User } from 'lucide-react';
import { useSupabase } from '../components/AuthProvider';
import EliminarCuenta from './EliminarCuenta';

export default function PerfilCliente({
  user,
}: {
  user: { email: string; full_name: string; esAdmin: boolean };
}) {
  const router = useRouter();
  const { supabase } = useSupabase();
  const [nombre, setNombre] = useState(user.full_name || '');
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  useEffect(() => {
    setNombre(user.full_name || '');
  }, [user.full_name]);

  const guardar = async (event: React.FormEvent) => {
    event.preventDefault();
    const nuevoNombre = nombre.trim();
    if (!nuevoNombre || guardando) {
      setMensaje({ tipo: 'error', texto: 'Escribe tu nombre completo para el certificado.' });
      return;
    }

    setGuardando(true);
    setMensaje(null);
    const { error } = await supabase.auth.updateUser({ data: { full_name: nuevoNombre } });
    setGuardando(false);

    if (error) {
      setMensaje({ tipo: 'error', texto: 'No se pudo guardar tu nombre. Inténtalo de nuevo.' });
      return;
    }

    setNombre(nuevoNombre);
    setMensaje({ tipo: 'ok', texto: 'Listo. Tus certificados usarán este nombre.' });
    router.refresh();
  };

  return (
    <div className="main-container max-w-xl">
      <div className="mb-6">
        <h1 className="flex items-center gap-3 text-3xl font-bold text-gray-800">
          <User className="h-8 w-8 text-primary" />
          Mi Perfil
        </h1>
        <p className="mt-2 text-gray-500">Este nombre es el que aparece en tu certificado.</p>
      </div>

      <form onSubmit={guardar} className="space-y-5 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
        <div>
          <label htmlFor="email" className="mb-2 block text-sm font-bold text-gray-700">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={user.email || ''}
            disabled
            className="w-full cursor-not-allowed rounded-xl border border-gray-200 bg-gray-100 px-4 py-3 text-gray-500"
          />
        </div>

        <div>
          <label htmlFor="nombre" className="mb-2 block text-sm font-bold text-gray-700">
            Nombre Completo
          </label>
          <input
            id="nombre"
            type="text"
            value={nombre}
            onChange={(event) => setNombre(event.target.value)}
            placeholder="Nombres y apellidos"
            autoComplete="name"
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>

        {mensaje && (
          <p
            role="status"
            className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium ${
              mensaje.tipo === 'ok'
                ? 'border-green-200 bg-green-50 text-green-700'
                : 'border-red-200 bg-red-50 text-red-700'
            }`}
          >
            {mensaje.tipo === 'ok' && <CheckCircle className="h-4 w-4 shrink-0" />}
            {mensaje.texto}
          </p>
        )}

        <button
          type="submit"
          disabled={guardando}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-blue-700 disabled:cursor-wait disabled:bg-blue-400"
        >
          {guardando && <Loader2 className="h-5 w-5 animate-spin" />}
          {guardando ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </form>

      <EliminarCuenta email={user.email || ''} bloqueado={user.esAdmin} />
    </div>
  );
}
