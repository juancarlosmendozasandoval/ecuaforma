import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export default function CtaFinal() {
  return (
    <section className="main-container py-20 sm:py-24">
      <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 px-6 py-14 text-center shadow-2xl shadow-orange-500/30 sm:px-12 sm:py-16">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.35),transparent_45%)]" />
        <h2 className="relative mx-auto max-w-2xl text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
          Tu examen no espera. Empieza a prepararte hoy.
        </h2>
        <p className="relative mx-auto mt-4 max-w-xl text-lg font-medium text-slate-900/80">
          Haz tu primer simulador gratis y descubre exactamente qué temas reforzar.
        </p>
        <div className="relative mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/simuladores"
            className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-7 py-4 text-lg font-extrabold text-white shadow-xl transition-transform hover:-translate-y-0.5"
          >
            Probar Simuladores
            <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
          </Link>
          <Link
            href="/cursos"
            className="inline-flex items-center justify-center rounded-2xl border-2 border-slate-950/80 px-7 py-4 text-lg font-extrabold text-slate-950 transition-colors hover:bg-slate-950 hover:text-white"
          >
            Explorar Cursos
          </Link>
        </div>
      </div>
    </section>
  );
}
