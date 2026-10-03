'use client';

import { useState } from 'react';
import { CreditCard, Loader2 } from 'lucide-react';

/** Abre la caja de PayPhone. El servidor fija el monto a partir del curso. */
export default function BotonPayPhone({
  cursoId,
  precio,
  disabled = false,
}: {
  cursoId: string;
  precio: number;
  disabled?: boolean;
}) {
  const [cargando, setCargando] = useState(false);
  const monto = Number.isFinite(precio) ? precio : 0;

  const pagar = async () => {
    if (disabled) return;
    setCargando(true);
    try {
      const response = await fetch('/api/payphone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cursoId }),
      });
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      alert(data.error || 'Hubo un problema generando el pago. Intenta de nuevo.');
      setCargando(false);
    } catch {
      alert('Error de conexión. Revisa tu internet.');
      setCargando(false);
    }
  };

  return (
    <button
      type="button"
      onClick={pagar}
      disabled={cargando || disabled}
      className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#FF6B00] py-3.5 text-lg font-bold text-white shadow-md transition-colors hover:bg-[#e66000] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-[#FF6B00]"
    >
      {cargando ? <Loader2 className="h-6 w-6 animate-spin" /> : <CreditCard className="h-6 w-6" />}
      {cargando ? 'Conectando con el banco...' : `Pagar $${monto} con PayPhone`}
    </button>
  );
}
