import { Quote, Star } from 'lucide-react';
import type { EstadisticasLanding } from '@/lib/landing/estadisticas';

type Testimonio = {
  nombre: string;
  logro: string;
  texto: string;
};

/**
 * Testimonios reales de alumnos, con su permiso. Mientras la lista esté
 * vacía, la sección muestra solo las cifras y las instituciones.
 */
const TESTIMONIOS: Testimonio[] = [];

const DESTINOS = ['FAE', 'ESMA', 'Armada', 'Ejército', 'Policía Nacional', 'Universidades públicas', 'Senescyt'];

/** Una cifra baja resta credibilidad: se oculta hasta superar este umbral. */
const MINIMO_VISIBLE = 50;

const COLUMNAS_LG: Record<number, string> = {
  1: 'lg:grid-cols-1',
  2: 'lg:grid-cols-2',
  3: 'lg:grid-cols-3',
  4: 'lg:grid-cols-4',
};

/** 1234 → "1.200+"; cifras pequeñas se muestran exactas. */
function cifra(valor: number) {
  if (valor < 100) return String(valor);
  const paso = valor < 1000 ? 50 : valor < 10000 ? 100 : 1000;
  return `${(Math.floor(valor / paso) * paso).toLocaleString('es-EC')}+`;
}

function iniciales(nombre: string) {
  return nombre
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase() || '')
    .join('');
}

export default function PruebaSocial({ estadisticas }: { estadisticas: EstadisticasLanding | null }) {
  const numeros = estadisticas
    ? [
        { total: estadisticas.preguntas, etiqueta: 'Preguntas con solución' },
        { total: estadisticas.simuladores, etiqueta: 'Simuladores activos' },
        { total: estadisticas.intentos, etiqueta: 'Exámenes rendidos' },
        { total: estadisticas.cursos, etiqueta: 'Cursos disponibles' },
      ]
        .filter((item) => item.total >= MINIMO_VISIBLE)
        .map((item) => ({ valor: cifra(item.total), etiqueta: item.etiqueta }))
    : [];
  const columnas = COLUMNAS_LG[numeros.length] || 'lg:grid-cols-4';

  return (
    <section className="relative overflow-hidden bg-[#050B1F] py-20 text-white sm:py-24">
      <div className="pointer-events-none absolute left-1/2 top-0 h-72 w-[44rem] -translate-x-1/2 rounded-full bg-blue-600/25 blur-3xl" />

      <div className="relative main-container">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-amber-300">Números que respaldan</p>
          <h2 className="mt-2 text-3xl font-black tracking-tight text-white sm:text-4xl">
            Estudiantes de todo el Ecuador ya entrenan con Ecuaforma
          </h2>
        </div>

        {numeros.length > 0 && (
          <div className={`mt-12 mx-auto grid max-w-4xl gap-px overflow-hidden rounded-3xl border border-white/10 bg-white/10 ${numeros.length > 1 ? 'grid-cols-2' : 'grid-cols-1'} ${columnas}`}>
            {numeros.map(({ valor, etiqueta }) => (
              <div key={etiqueta} className="bg-[#081233] p-6 text-center sm:p-8">
                <p className="bg-gradient-to-b from-white to-slate-300 bg-clip-text text-3xl font-black text-transparent sm:text-5xl">
                  {valor}
                </p>
                <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-slate-400 sm:text-sm">{etiqueta}</p>
              </div>
            ))}
          </div>
        )}

        {TESTIMONIOS.length > 0 && (
          <div className="-mx-4 mt-10 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0">
            {TESTIMONIOS.map((testimonio) => (
              <figure
                key={testimonio.nombre}
                className="w-[85%] shrink-0 snap-center rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur md:w-auto"
              >
                <Quote className="h-8 w-8 text-amber-300/70" />
                <div className="mt-3 flex gap-0.5 text-amber-300">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-current" />
                  ))}
                </div>
                <blockquote className="mt-4 leading-relaxed text-slate-200">“{testimonio.texto}”</blockquote>
                <figcaption className="mt-6 flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-orange-500 font-black text-slate-950">
                    {iniciales(testimonio.nombre)}
                  </span>
                  <span>
                    <span className="block font-bold text-white">{testimonio.nombre}</span>
                    <span className="block text-sm text-amber-200">{testimonio.logro}</span>
                  </span>
                </figcaption>
              </figure>
            ))}
          </div>
        )}

        <div className="mt-12 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Preparación para</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2.5">
            {DESTINOS.map((destino) => (
              <span
                key={destino}
                className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-bold text-slate-200"
              >
                {destino}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
