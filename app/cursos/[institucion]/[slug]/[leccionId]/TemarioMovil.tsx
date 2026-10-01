'use client';

import { useEffect, useRef, useState } from 'react';
import { ListVideo, X } from 'lucide-react';
import ListaTemario, { type ItemTemarioVista } from './ListaTemario';

/** En el teléfono el índice se abre como panel. En escritorio lo reemplaza la barra lateral. */
export default function TemarioMovil({
  items,
  actualId,
  hrefBase,
  numeroActual,
  total,
  completadas,
}: {
  items: ItemTemarioVista[];
  actualId: string;
  hrefBase: string;
  numeroActual: number;
  total: number;
  completadas: number;
}) {
  const [abierto, setAbierto] = useState(false);
  const listaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setAbierto(false);
  }, [actualId]);

  useEffect(() => {
    if (!abierto) return;
    const lista = listaRef.current;
    const activo = lista?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!lista || !activo) return;
    const frame = requestAnimationFrame(() => {
      lista.scrollTop = Math.max(0, activo.offsetTop - lista.clientHeight / 2);
    });
    return () => cancelAnimationFrame(frame);
  }, [abierto, actualId]);

  useEffect(() => {
    if (!abierto || typeof document === 'undefined' || !document.body) return;
    const anterior = document.body.style.overflow || '';
    document.body.style.overflow = 'hidden';
    return () => {
      if (document.body) document.body.style.overflow = anterior;
    };
  }, [abierto]);

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="sticky top-20 z-30 flex w-full items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur lg:hidden"
      >
        <span className="flex min-w-0 items-center gap-2 text-sm font-bold text-gray-800">
          <ListVideo className="h-5 w-5 shrink-0 text-primary" />
          <span className="truncate">Clase {numeroActual} de {total}</span>
        </span>
        <span className="shrink-0 text-xs font-bold text-indigo-600">Ver temario</span>
      </button>

      {abierto && (
        <div className="fixed inset-0 z-[70] flex flex-col lg:hidden" role="dialog" aria-modal="true" aria-label="Temario del curso">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setAbierto(false)} />
          <div className="relative mt-auto flex max-h-[85vh] min-h-0 w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl">
            <div className="flex shrink-0 items-center justify-between rounded-t-2xl bg-slate-900 p-4 text-white">
              <div className="flex items-center gap-2">
                <ListVideo className="h-5 w-5" />
                <h3 className="font-bold">Contenido</h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-slate-800 px-2 py-1 text-xs font-bold text-indigo-300">
                  {completadas} / {total}
                </span>
                <button
                  type="button"
                  onClick={() => setAbierto(false)}
                  className="rounded-lg p-1.5 text-slate-300 hover:bg-slate-800 hover:text-white"
                  aria-label="Cerrar temario"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div ref={listaRef} className="min-h-0 flex-1 overflow-y-auto">
              <ListaTemario items={items} actualId={actualId} hrefBase={hrefBase} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
