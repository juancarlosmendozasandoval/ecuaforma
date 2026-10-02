import Link from 'next/link';
import { ArrowRight, BookOpenCheck, Brain, GraduationCap, Shield, Target } from 'lucide-react';

const INSTITUCIONES = [
  { nombre: 'FAE', slug: 'fae', imagen: '/fae-background.jpg' },
  { nombre: 'Armada', slug: 'armada', imagen: '/armada-background.jpg' },
  { nombre: 'Ejército', slug: 'ejercito', imagen: '/ejercito-background.jpg' },
  { nombre: 'Policía', slug: 'policia', imagen: '/policia-background.jpg' },
];

const UNIVERSIDAD = [
  { icono: Brain, texto: 'Razonamiento verbal, numérico y abstracto' },
  { icono: BookOpenCheck, texto: 'Matemática, física y química desde cero' },
  { icono: Target, texto: 'Simulacros con el formato del examen real' },
];

export default function CaminosDuales() {
  return (
    <section className="main-container pt-16 sm:pt-20">
      <div className="mb-10 text-center">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-primary">Elige tu camino</p>
        <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">¿Hacia dónde vas?</h2>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <article className="group relative flex flex-col overflow-hidden rounded-3xl bg-gradient-to-br from-sky-500 via-blue-600 to-indigo-700 p-7 text-white shadow-xl shadow-blue-900/20 transition-transform duration-300 hover:-translate-y-1 sm:p-9">
          <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/15 blur-2xl" />
          <GraduationCap className="pointer-events-none absolute -bottom-8 -right-6 h-48 w-48 text-white/10" />

          <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 backdrop-blur">
            <GraduationCap className="h-7 w-7" />
          </div>
          <h3 className="relative mt-6 text-2xl font-black text-white sm:text-3xl">Ingreso a Universidades</h3>
          <p className="relative mt-3 max-w-md text-blue-100">
            Llega listo al examen de admisión con práctica diaria y clases que explican cada tema sin rodeos.
          </p>

          <ul className="relative mt-6 space-y-3">
            {UNIVERSIDAD.map(({ icono: Icono, texto }) => (
              <li key={texto} className="flex items-center gap-3 text-sm font-semibold text-white sm:text-base">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/15">
                  <Icono className="h-4 w-4" />
                </span>
                {texto}
              </li>
            ))}
          </ul>

          <div className="relative mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/simuladores"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3.5 font-extrabold text-blue-700 shadow-lg transition-colors hover:bg-blue-50"
            >
              Practicar admisión <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/cursos"
              className="inline-flex items-center justify-center rounded-xl border border-white/40 px-5 py-3.5 font-bold text-white transition-colors hover:bg-white/10"
            >
              Ver cursos
            </Link>
          </div>
        </article>

        <article className="group relative flex flex-col overflow-hidden rounded-3xl bg-slate-950 p-7 text-white shadow-xl shadow-slate-900/30 transition-transform duration-300 hover:-translate-y-1 sm:p-9">
          <div className="pointer-events-none absolute -left-16 -top-16 h-64 w-64 rounded-full bg-amber-500/20 blur-2xl" />
          <Shield className="pointer-events-none absolute -bottom-8 -right-6 h-48 w-48 text-white/5" />

          <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-400/20 text-amber-300">
            <Shield className="h-7 w-7" />
          </div>
          <h3 className="relative mt-6 text-2xl font-black text-white sm:text-3xl">Fuerzas Armadas y Policía</h3>
          <p className="relative mt-3 max-w-md text-slate-300">
            Entrena las pruebas de conocimiento de cada escuela con bancos de preguntas específicos por institución.
          </p>

          <div className="relative mt-6 grid grid-cols-2 gap-3">
            {INSTITUCIONES.map((inst) => (
              <Link
                key={inst.slug}
                href={`/simuladores/${inst.slug}`}
                className="group/inst relative h-20 overflow-hidden rounded-xl border border-white/10 sm:h-24"
              >
                <div
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover/inst:scale-110"
                  style={{ backgroundImage: `url(${inst.imagen})` }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/50 to-slate-950/20" />
                <span className="absolute bottom-2 left-3 flex items-center gap-1 text-sm font-extrabold text-white sm:text-base">
                  {inst.nombre} <ArrowRight className="h-3.5 w-3.5 text-amber-300" />
                </span>
              </Link>
            ))}
          </div>

          <div className="relative mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/cursos"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 px-5 py-3.5 font-extrabold text-slate-950 shadow-lg transition-opacity hover:opacity-90"
            >
              Ver cursos militares <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/simuladores"
              className="inline-flex items-center justify-center rounded-xl border border-white/25 px-5 py-3.5 font-bold text-white transition-colors hover:bg-white/10"
            >
              Simuladores
            </Link>
          </div>
        </article>
      </div>
    </section>
  );
}
