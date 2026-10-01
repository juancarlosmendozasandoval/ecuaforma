'use client';

import { useMemo, useState } from 'react';
import { Activity, Search } from 'lucide-react';

export type IntentoRendimiento = {
  id: string;
  fecha: string;
  email: string;
  nombre: string;
  examen: string;
  puntaje: number;
};

function claseNota(puntaje: number) {
  if (puntaje >= 70) return 'bg-green-50 text-green-700 border-green-200';
  if (puntaje >= 50) return 'bg-amber-50 text-amber-700 border-amber-200';
  return 'bg-red-50 text-red-700 border-red-200';
}

function formatearFecha(valor: string) {
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return '';
  return fecha.toLocaleString('es-EC', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Guayaquil',
  });
}

export default function RendimientoCliente({
  intentos,
  errorLista,
}: {
  intentos: IntentoRendimiento[];
  errorLista: string;
}) {
  const [busqueda, setBusqueda] = useState('');
  const termino = busqueda.trim().toLowerCase();

  const visibles = useMemo(() => {
    if (!termino) return intentos;
    return intentos.filter((intento) => {
      const estudiante = `${intento.nombre} ${intento.email}`.toLowerCase();
      return estudiante.includes(termino) || (intento.examen || '').toLowerCase().includes(termino);
    });
  }, [intentos, termino]);

  return (
    <div className="max-w-6xl mx-auto py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
            <Activity className="text-emerald-600 w-8 h-8" /> Radar de Rendimiento
          </h1>
          <p className="text-gray-500 mt-1">Los intentos más recientes de todos los alumnos.</p>
        </div>
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar estudiante o examen..."
            className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {errorLista ? (
          <p className="p-10 text-center text-rose-600">{errorLista}</p>
        ) : intentos.length === 0 ? (
          <p className="p-10 text-center text-gray-500">Todavía no hay calificaciones registradas.</p>
        ) : visibles.length === 0 ? (
          <p className="p-10 text-center text-gray-500">Ningún intento coincide con esa búsqueda.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-500 font-bold text-xs uppercase border-b border-gray-100">
                  <th className="p-4">Fecha y hora</th>
                  <th className="p-4">Estudiante</th>
                  <th className="p-4">Examen</th>
                  <th className="p-4 text-right">Puntaje</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {visibles.map((intento) => {
                  const puntaje = Number(intento.puntaje) || 0;
                  const estudiante = intento.nombre || intento.email || 'Sin identificar';
                  return (
                    <tr key={intento.id} className="hover:bg-gray-50/70">
                      <td className="p-4 text-sm text-gray-600 whitespace-nowrap">
                        {formatearFecha(intento.fecha || '') || 'Sin fecha'}
                      </td>
                      <td className="p-4">
                        <p className="text-sm font-semibold text-gray-800">{estudiante}</p>
                        {intento.nombre && intento.email ? (
                          <p className="text-xs text-gray-400">{intento.email}</p>
                        ) : null}
                      </td>
                      <td className="p-4 text-sm text-gray-700">{intento.examen || 'Simulador no disponible'}</td>
                      <td className="p-4 text-right">
                        <span className={`inline-block rounded-lg border px-3 py-1 text-sm font-black tabular-nums ${claseNota(puntaje)}`}>
                          {puntaje} / 100
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
