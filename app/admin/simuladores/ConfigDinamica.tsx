'use client';

import { useMemo, useState } from 'react';
import { AlertTriangle, Search, Shuffle } from 'lucide-react';
import {
  CANTIDAD_MAXIMA,
  CANTIDAD_MINIMA,
  type ConfigDinamica as Config,
  type TemaSelector,
} from '@/lib/simuladores/configDinamica';

type Props = {
  temas: TemaSelector[];
  valor: Config;
  onChange: (valor: Config) => void;
  disabled?: boolean;
};

/** Interruptor de Mega-Simulador con cantidad y temas agrupados por materia. */
export default function ConfigDinamica({ temas, valor, onChange, disabled }: Props) {
  const [filtro, setFiltro] = useState('');
  const seleccion = useMemo(() => new Set(valor.temas_dinamicos), [valor.temas_dinamicos]);

  const grupos = useMemo(() => {
    const termino = filtro.trim().toLowerCase();
    const mapa = new Map<string, TemaSelector[]>();
    for (const tema of temas) {
      if (termino && !`${tema.nombre} ${tema.materia}`.toLowerCase().includes(termino)) continue;
      mapa.set(tema.materia, [...(mapa.get(tema.materia) || []), tema]);
    }
    return Array.from(mapa.entries());
  }, [temas, filtro]);

  const conConteo = temas.some((tema) => tema.preguntas !== null);
  const banco = temas.reduce((total, tema) => total + (seleccion.has(tema.id) ? tema.preguntas || 0 : 0), 0);
  const cantidad = valor.cantidad_preguntas;
  const cantidadValida = Number.isInteger(cantidad) && cantidad >= CANTIDAD_MINIMA && cantidad <= CANTIDAD_MAXIMA;

  const cambiarTemas = (ids: string[], marcar: boolean) => {
    const siguiente = new Set(seleccion);
    ids.forEach((id) => (marcar ? siguiente.add(id) : siguiente.delete(id)));
    onChange({ ...valor, temas_dinamicos: Array.from(siguiente) });
  };

  return (
    <div className={`rounded-xl border p-4 transition-colors ${valor.es_dinamico ? 'border-violet-200 bg-violet-50/60' : 'border-gray-200 bg-white'}`}>
      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          role="switch"
          checked={valor.es_dinamico}
          disabled={disabled}
          onChange={(e) => onChange({ ...valor, es_dinamico: e.target.checked })}
          className="peer sr-only"
        />
        <span className="relative mt-0.5 h-6 w-11 shrink-0 rounded-full bg-gray-300 transition-colors after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:bg-violet-600 peer-checked:after:translate-x-5 peer-focus-visible:ring-2 peer-focus-visible:ring-violet-400 peer-disabled:opacity-50" />
        <span>
          <span className="flex items-center gap-1.5 text-sm font-bold text-gray-800">
            <Shuffle className="h-4 w-4 text-violet-600" /> Simulador Dinámico (Aleatorio)
          </span>
          <span className="mt-0.5 block text-xs text-gray-500">
            Cada intento toma preguntas al azar de los temas elegidos, en lugar de una lista fija.
          </span>
        </span>
      </label>

      {valor.es_dinamico && (
        <div className="mt-4 space-y-4 border-t border-violet-100 pt-4">
          <div>
            <label htmlFor="cantidad_preguntas" className="mb-1 block text-xs font-bold uppercase text-violet-800">
              Preguntas por intento
            </label>
            <input
              id="cantidad_preguntas"
              type="number"
              min={CANTIDAD_MINIMA}
              max={CANTIDAD_MAXIMA}
              step={1}
              disabled={disabled}
              value={Number.isFinite(cantidad) ? cantidad : ''}
              onChange={(e) => onChange({ ...valor, cantidad_preguntas: e.target.value === '' ? NaN : Number(e.target.value) })}
              className={`w-28 rounded-lg border bg-white p-2 text-sm font-bold text-gray-800 outline-none focus:ring-2 focus:ring-violet-500 ${cantidadValida ? 'border-violet-200' : 'border-rose-400'}`}
            />
            <span className="ml-2 text-xs text-gray-500">Entre {CANTIDAD_MINIMA} y {CANTIDAD_MAXIMA}.</span>
          </div>

          <div>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold uppercase text-violet-800">
                Temas ({seleccion.size} seleccionados)
              </span>
              {temas.length > 8 && (
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                  <input
                    type="search"
                    value={filtro}
                    onChange={(e) => setFiltro(e.target.value)}
                    placeholder="Filtrar temas..."
                    className="w-44 rounded-lg border border-violet-200 bg-white py-1.5 pl-8 pr-2 text-xs outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
              )}
            </div>

            {temas.length === 0 ? (
              <p className="rounded-lg bg-white p-3 text-xs text-gray-500">
                No hay temas creados. Créalos en Categorías y asígnalos a las preguntas.
              </p>
            ) : (
              <div className="max-h-72 space-y-3 overflow-y-auto rounded-lg border border-violet-100 bg-white p-3">
                {grupos.length === 0 && <p className="text-xs text-gray-400">Ningún tema coincide con el filtro.</p>}
                {grupos.map(([materia, lista]) => {
                  const ids = lista.map((tema) => tema.id);
                  const todos = ids.every((id) => seleccion.has(id));
                  return (
                    <fieldset key={materia}>
                      <legend className="flex w-full items-center justify-between gap-2 pb-1">
                        <span className="text-xs font-extrabold uppercase tracking-wide text-gray-500">{materia}</span>
                        <button
                          type="button"
                          disabled={disabled}
                          onClick={() => cambiarTemas(ids, !todos)}
                          className="text-[11px] font-bold text-violet-700 hover:underline disabled:opacity-50"
                        >
                          {todos ? 'Quitar todos' : 'Elegir todos'}
                        </button>
                      </legend>
                      <div className="grid gap-1 sm:grid-cols-2">
                        {lista.map((tema) => (
                          <label
                            key={tema.id}
                            className={`flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors ${seleccion.has(tema.id) ? 'bg-violet-100 text-violet-900' : 'hover:bg-gray-50 text-gray-700'}`}
                          >
                            <input
                              type="checkbox"
                              checked={seleccion.has(tema.id)}
                              disabled={disabled}
                              onChange={(e) => cambiarTemas([tema.id], e.target.checked)}
                              className="h-4 w-4 rounded text-violet-600 focus:ring-violet-500"
                            />
                            <span className="flex-1 truncate" title={tema.nombre}>{tema.nombre}</span>
                            {tema.preguntas !== null && (
                              <span className={`text-[11px] font-bold ${tema.preguntas ? 'text-gray-400' : 'text-rose-400'}`}>
                                {tema.preguntas}
                              </span>
                            )}
                          </label>
                        ))}
                      </div>
                    </fieldset>
                  );
                })}
              </div>
            )}

            {seleccion.size === 0 ? (
              <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-rose-600">
                <AlertTriangle className="h-3.5 w-3.5" /> Elige al menos un tema para poder guardar.
              </p>
            ) : conConteo && cantidadValida && banco < cantidad ? (
              <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-amber-700">
                <AlertTriangle className="h-3.5 w-3.5" /> El banco tiene {banco} preguntas en estos temas: cada intento tendrá {banco} en vez de {cantidad}.
              </p>
            ) : conConteo ? (
              <p className="mt-2 text-xs text-gray-500">Banco disponible: {banco} preguntas.</p>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
