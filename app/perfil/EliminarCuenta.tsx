'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, Loader2, Trash2, X } from 'lucide-react';
import { useSupabase } from '../components/AuthProvider';
import { eliminarCuentaUsuario } from './acciones';

const PALABRA_CONFIRMACION = 'ELIMINAR';

/** Botón discreto + modal severo para el derecho de eliminación de datos (LOPDP). */
export default function EliminarCuenta({ email, bloqueado }: { email: string; bloqueado: boolean }) {
  const { supabase } = useSupabase();
  const [abierto, setAbierto] = useState(false);
  const [texto, setTexto] = useState('');
  const [eliminando, setEliminando] = useState(false);
  const [error, setError] = useState('');

  const confirmado = texto.trim().toUpperCase() === PALABRA_CONFIRMACION;

  useEffect(() => {
    if (!abierto) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !eliminando && setAbierto(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [abierto, eliminando]);

  const abrir = () => {
    setTexto('');
    setError('');
    setAbierto(true);
  };

  const eliminar = async () => {
    if (!confirmado || eliminando) return;
    setEliminando(true);
    setError('');

    const resultado = await eliminarCuentaUsuario(texto);
    if (!resultado.ok) {
      setError(resultado.mensaje);
      setEliminando(false);
      return;
    }

    // La cuenta ya no existe en Auth: se limpia la sesión local sin llamar al servidor.
    await supabase.auth.signOut({ scope: 'local' });
    window.location.assign('/');
  };

  return (
    <section className="mt-10 border-t border-gray-200 pt-6">
      <h2 className="text-sm font-bold text-gray-700">Eliminar cuenta</h2>
      <p className="mt-1 text-sm text-gray-500">
        Borra tu cuenta y tus datos personales de Ecuaforma. Esta acción no se puede deshacer.
      </p>
      <button
        type="button"
        onClick={abrir}
        disabled={bloqueado}
        title={bloqueado ? 'La cuenta administradora no se puede eliminar' : undefined}
        className="mt-3 inline-flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 transition-colors hover:border-red-300 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
      >
        <Trash2 className="h-4 w-4" />
        Eliminar mi cuenta definitivamente
      </button>

      {abierto && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[1px]" onClick={() => !eliminando && setAbierto(false)} />

          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="titulo-eliminar-cuenta"
            aria-describedby="detalle-eliminar-cuenta"
            className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
          >
            <div className="flex items-start gap-4 border-b border-red-100 bg-red-50 p-5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600">
                <AlertTriangle className="h-6 w-6" />
              </span>
              <div className="min-w-0 flex-1">
                <h2 id="titulo-eliminar-cuenta" className="text-lg font-bold text-red-900">
                  ¿Eliminar tu cuenta para siempre?
                </h2>
                <p className="mt-0.5 break-all text-sm text-red-700">{email}</p>
              </div>
              <button
                type="button"
                onClick={() => setAbierto(false)}
                disabled={eliminando}
                aria-label="Cerrar"
                className="rounded-lg p-1.5 text-red-400 hover:bg-red-100 hover:text-red-700 disabled:opacity-40"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div id="detalle-eliminar-cuenta" className="space-y-4 p-5 text-sm text-gray-700">
              <p className="font-semibold text-gray-900">Esta acción es irreversible. Perderás de inmediato:</p>
              <ul className="list-disc space-y-1 pl-5">
                <li>El acceso a todos tus cursos, incluidos los que compraste.</li>
                <li>El acceso a los simuladores comprados y todo tu historial de intentos y puntajes.</li>
                <li>Tu progreso en las lecciones y tus certificados.</li>
              </ul>
              <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                Las compras no se reembolsan al eliminar la cuenta. Si vuelves a registrarte con el mismo correo,
                empezarás desde cero.
              </p>

              <div>
                <label htmlFor="confirmar-eliminacion" className="mb-1.5 block text-xs font-bold uppercase text-gray-500">
                  Escribe <span className="text-red-600">{PALABRA_CONFIRMACION}</span> para confirmar
                </label>
                <input
                  id="confirmar-eliminacion"
                  type="text"
                  autoFocus
                  autoComplete="off"
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                  disabled={eliminando}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 font-mono tracking-wider outline-none focus:border-red-400 focus:bg-white focus:ring-2 focus:ring-red-100"
                />
              </div>

              {error && (
                <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                  {error}
                </p>
              )}
            </div>

            <div className="flex justify-end gap-3 border-t border-gray-100 p-4">
              <button
                type="button"
                onClick={() => setAbierto(false)}
                disabled={eliminando}
                className="rounded-xl px-4 py-2.5 text-sm font-bold text-gray-600 transition-colors hover:bg-gray-100 disabled:opacity-40"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={eliminar}
                disabled={!confirmado || eliminando}
                className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-bold text-white shadow-md transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-300"
              >
                {eliminando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                {eliminando ? 'Eliminando...' : 'Eliminar definitivamente'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
