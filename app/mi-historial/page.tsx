import Link from 'next/link';
import { ArrowRight, Clock, History } from 'lucide-react';
import { requireAuth } from '@/lib/auth/requireAuth';

export const dynamic = 'force-dynamic';

type SimuladorResumen = { nombre: string | null; slug: string | null };

type IntentoHistorial = {
  id: string;
  puntaje: number;
  total_preguntas: number;
  created_at: string;
  simuladores: SimuladorResumen | SimuladorResumen[] | null;
};

function leerSimulador(valor: IntentoHistorial['simuladores']): SimuladorResumen | null {
  const fila = Array.isArray(valor) ? valor[0] : valor;
  if (!fila || typeof fila !== 'object') return null;
  return fila;
}

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
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Guayaquil',
  });
}

export default async function MiHistorialPage() {
  const { supabase, user } = await requireAuth();

  const { data, error } = await supabase
    .from('historial_simuladores')
    .select('id, puntaje, total_preguntas, created_at, simuladores(nombre, slug)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error al cargar historial:', error);
    return (
      <div className="main-container py-10 text-center">
        <p className="text-red-500">Hubo un problema cargando tu progreso.</p>
      </div>
    );
  }

  const intentos = (data || []) as IntentoHistorial[];

  return (
    <div className="main-container py-10">
      <div className="flex flex-col md:flex-row md:items-center gap-4 mb-8">
        <div className="p-3 bg-blue-100 rounded-full text-blue-600 w-fit">
          <History size={32} />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Mi Progreso</h1>
          <p className="text-text-secondary">Historial de simuladores. Cada intento queda guardado para que veas cómo vas mejorando.</p>
        </div>
      </div>

      {intentos.length === 0 ? (
        <div className="text-center py-16 px-6 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
          <p className="text-xl font-semibold text-gray-800 mb-2">Todavía no has rendido ningún examen.</p>
          <p className="text-text-secondary mb-6">Cuando termines un simulador, tu nota aparecerá aquí.</p>
          <Link
            href="/simuladores"
            className="inline-flex items-center bg-primary text-white font-bold py-3 px-6 rounded-lg hover:bg-secondary transition-colors"
          >
            Ver simuladores <ArrowRight className="ml-2 w-5 h-5" />
          </Link>
        </div>
      ) : (
        <ul className="grid gap-4">
          {intentos.map((item) => {
            const simulador = leerSimulador(item.simuladores);
            const titulo = simulador?.nombre || 'Simulador no disponible';
            const fecha = formatearFecha(item.created_at || '');
            const puntaje = Number(item.puntaje) || 0;
            const total = Number(item.total_preguntas) || 0;

            return (
              <li
                key={item.id}
                className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="min-w-0 text-left">
                  <h2 className="text-lg font-bold text-gray-800 truncate">{titulo}</h2>
                  <p className="mt-1 flex items-center text-sm text-text-secondary">
                    <Clock size={14} className="mr-1 shrink-0" />
                    {fecha || 'Sin fecha'}
                  </p>
                  <p className="mt-1 text-xs text-gray-400">{total} preguntas</p>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3">
                  <p className={`rounded-xl border px-4 py-2 text-2xl font-black tabular-nums ${claseNota(puntaje)}`}>
                    {puntaje} / 100
                  </p>
                  {simulador?.slug ? (
                    <Link
                      href={`/simulador/${simulador.slug}`}
                      className="p-3 text-gray-400 hover:text-primary hover:bg-blue-50 rounded-full transition-all"
                      title="Repetir este simulador"
                    >
                      <ArrowRight size={24} />
                    </Link>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
