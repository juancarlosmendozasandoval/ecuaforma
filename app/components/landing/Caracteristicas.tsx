import { LineChart, MessageSquareText, MonitorPlay, Target, type LucideIcon } from 'lucide-react';

type Caracteristica = {
  icono: LucideIcon;
  titulo: string;
  texto: string;
  acento: string;
};

const CARACTERISTICAS: Caracteristica[] = [
  {
    icono: Target,
    titulo: 'Simuladores exactos',
    texto: 'Practica con el formato, la dificultad y el tiempo del examen real, por institución y por materia.',
    acento: 'from-blue-500 to-indigo-600',
  },
  {
    icono: MonitorPlay,
    titulo: 'Clases en video paso a paso',
    texto: 'Cada tema resuelto en pizarra, con apuntes descargables para repasar cuando quieras.',
    acento: 'from-amber-400 to-orange-500',
  },
  {
    icono: MessageSquareText,
    titulo: 'Retroalimentación experta',
    texto: 'Al responder ves por qué la opción es correcta o no, y el video que explica la solución.',
    acento: 'from-emerald-400 to-teal-600',
  },
];

export default function Caracteristicas() {
  return (
    <section className="main-container py-20 sm:py-24">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-primary">Por qué Ecuaforma</p>
        <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
          Todo lo que necesitas para aprobar, en un solo lugar
        </h2>
      </div>

      <div className="mt-12 grid gap-5 md:grid-cols-3">
        {CARACTERISTICAS.map(({ icono: Icono, titulo, texto, acento }) => (
          <article
            key={titulo}
            className="group relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-7 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
          >
            <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${acento}`} />
            <div className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${acento} text-white shadow-lg`}>
              <Icono className="h-7 w-7" />
            </div>
            <h3 className="mt-6 text-xl font-extrabold text-slate-900">{titulo}</h3>
            <p className="mt-3 leading-relaxed text-slate-600">{texto}</p>
          </article>
        ))}
      </div>

      <div className="mt-5 flex flex-col items-center justify-center gap-3 rounded-3xl border border-slate-200/80 bg-gradient-to-r from-slate-50 to-blue-50 p-6 text-center sm:flex-row sm:text-left">
        <LineChart className="h-8 w-8 shrink-0 text-primary" />
        <p className="font-semibold text-slate-700">
          Además, tu historial guarda cada intento para que veas exactamente cuánto mejoras.
        </p>
      </div>
    </section>
  );
}
