'use client';

import Link from 'next/link';
import { CheckCircle } from 'lucide-react';

export type ItemTemarioVista = {
  id: string;
  numero: number;
  titulo: string;
  moduloId: string;
  moduloTitulo: string;
  completada: boolean;
};

/** Índice del curso. La lección abierta lleva fondo azul y texto en negrita. */
export default function ListaTemario({
  items,
  actualId,
  hrefBase,
}: {
  items: ItemTemarioVista[];
  actualId: string;
  hrefBase: string;
}) {
  return (
    <div>
      {items.map((lec, idx) => {
        const activa = lec.id === actualId;
        const mostrarModulo = idx === 0 || items[idx - 1].moduloId !== lec.moduloId;

        return (
          <div key={lec.id}>
            {mostrarModulo && (
              <div className="sticky top-0 z-10 border-y border-indigo-100 bg-indigo-50/90 px-4 py-2 backdrop-blur-sm">
                <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-800">
                  {lec.moduloTitulo || 'Módulo'}
                </h4>
              </div>
            )}
            <Link
              href={`${hrefBase}/${lec.id}`}
              aria-current={activa ? 'page' : undefined}
              className={`flex items-start gap-3 border-b border-gray-50 border-l-4 p-4 transition-colors ${
                activa ? 'border-l-blue-600 bg-blue-50' : 'border-l-transparent hover:bg-gray-50'
              }`}
            >
              <div className="mt-0.5 shrink-0">
                {lec.completada ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <div className="h-5 w-5 rounded-full border-2 border-gray-300" />
                )}
              </div>
              <div className="min-w-0">
                <span className={`mb-0.5 block text-xs font-bold ${activa ? 'text-blue-700' : 'text-gray-400'}`}>
                  Clase {lec.numero}
                </span>
                <h4 className={`text-sm leading-tight ${activa ? 'font-bold text-blue-900' : 'font-medium text-gray-600'}`}>
                  {lec.titulo}
                </h4>
              </div>
            </Link>
          </div>
        );
      })}
    </div>
  );
}
