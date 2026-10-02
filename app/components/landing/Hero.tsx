import Link from 'next/link';
import { ArrowRight, CheckCircle2, GraduationCap, PlayCircle, Shield, Sparkles } from 'lucide-react';

const OPCIONES_DEMO = ['x = 4', 'x = 6', 'x = 8', 'x = 12'];

/** Vista previa decorativa de una pregunta del simulador. */
function TarjetaDemo() {
  return (
    <div className="relative mx-auto w-full max-w-md lg:mx-0" aria-hidden="true">
      <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-tr from-amber-400/30 via-sky-400/20 to-indigo-500/30 blur-2xl" />
      <div className="relative rounded-3xl border border-white/15 bg-white/10 p-5 shadow-2xl backdrop-blur-xl sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold text-sky-100">Simulador · Matemática</span>
          <span className="text-xs font-semibold text-slate-300">Pregunta 7 / 20</span>
        </div>
        <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-white/10">
          <div className="h-full w-[35%] rounded-full bg-gradient-to-r from-amber-300 to-amber-500" />
        </div>
        <p className="mb-5 text-base font-semibold leading-relaxed text-white sm:text-lg">
          Si 3x − 4 = 2x + 4, ¿cuál es el valor de x?
        </p>
        <div className="grid grid-cols-2 gap-2.5">
          {OPCIONES_DEMO.map((opcion) => {
            const correcta = opcion === 'x = 8';
            return (
              <div
                key={opcion}
                className={`rounded-xl border px-3 py-3 text-center text-sm font-bold ${
                  correcta
                    ? 'border-emerald-300/70 bg-emerald-400/20 text-emerald-100'
                    : 'border-white/15 bg-white/5 text-slate-200'
                }`}
              >
                {opcion}
              </div>
            );
          })}
        </div>
        <div className="mt-4 flex items-start gap-2 rounded-xl bg-emerald-400/10 p-3 text-sm text-emerald-100">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <span>¡Correcto! Pasa 2x a la izquierda y 4 a la derecha: x = 8.</span>
        </div>
      </div>
      <div className="absolute -bottom-5 -left-3 hidden items-center gap-2 rounded-2xl border border-white/15 bg-slate-900/80 px-4 py-3 text-sm font-bold text-white shadow-xl backdrop-blur sm:flex">
        <PlayCircle className="h-5 w-5 text-amber-300" /> Video con la resolución
      </div>
    </div>
  );
}

export default function Hero() {
  return (
    <section className="relative -mt-8 overflow-hidden bg-[#050B1F] text-white sm:-mt-12">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:44px_44px] [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_75%)]" />
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[32rem] w-[52rem] -translate-x-1/2 rounded-full bg-blue-600/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 right-0 h-80 w-80 rounded-full bg-amber-500/20 blur-3xl" />

      <div className="relative main-container grid items-center gap-14 pb-20 pt-14 sm:pt-20 lg:grid-cols-2 lg:gap-10 lg:pb-28 lg:pt-24">
        <div className="text-center lg:text-left">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-amber-200 backdrop-blur sm:px-4 sm:text-sm sm:tracking-wider">
            <Sparkles className="h-4 w-4" /> Universidades · Fuerzas Armadas · Policía
          </span>

          <h1 className="mt-6 text-4xl font-black leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-6xl">
            Asegura tu futuro.{' '}
            <span className="bg-gradient-to-r from-amber-200 via-amber-400 to-orange-400 bg-clip-text text-transparent">
              Aprueba a la primera.
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-slate-300 lg:mx-0 sm:text-xl">
            Prepárate para la universidad o para tu ingreso a las Fuerzas Armadas y la Policía con simuladores reales,
            clases paso a paso y retroalimentación en cada respuesta.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
            <Link
              href="/cursos"
              className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 px-7 py-4 text-lg font-extrabold text-slate-950 shadow-[0_10px_40px_-10px_rgba(251,191,36,0.7)] transition-transform hover:-translate-y-0.5"
            >
              Explorar Cursos
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="/simuladores"
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/25 bg-white/10 px-7 py-4 text-lg font-bold text-white backdrop-blur transition-colors hover:bg-white hover:text-slate-950"
            >
              Probar Simuladores
            </Link>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm font-semibold text-slate-400 lg:justify-start">
            <span className="flex items-center gap-1.5"><GraduationCap className="h-4 w-4 text-sky-300" /> Admisión universitaria</span>
            <span className="flex items-center gap-1.5"><Shield className="h-4 w-4 text-amber-300" /> FAE, Armada, Ejército y Policía</span>
          </div>
        </div>

        <TarjetaDemo />
      </div>
    </section>
  );
}
