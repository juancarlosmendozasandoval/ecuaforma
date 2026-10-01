'use client';

import { useEffect, useRef, type ReactNode } from 'react';

/** Desplaza la barra hasta la lección abierta, sin mover el resto de la página. */
export default function CajaTemario({ activoId, children }: { activoId: string; children: ReactNode }) {
  const listaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const lista = listaRef.current;
    const activo = lista?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!lista || !activo) return;
    const frame = requestAnimationFrame(() => {
      lista.scrollTop = Math.max(0, activo.offsetTop - lista.clientHeight / 2);
    });
    return () => cancelAnimationFrame(frame);
  }, [activoId]);

  return (
    <div ref={listaRef} className="max-h-[calc(100vh-8rem)] overflow-y-auto">
      {children}
    </div>
  );
}
