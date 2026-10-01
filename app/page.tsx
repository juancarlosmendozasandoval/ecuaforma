import Link from 'next/link';
import { ArrowRight, Target, TrendingUp, Video } from 'lucide-react';

const beneficios = [
  {
    icono: Target,
    titulo: 'Banco de Preguntas Actualizado',
    texto: 'Simuladores con retroalimentación inmediata.',
  },
  {
    icono: TrendingUp,
    titulo: 'Historial de Rendimiento',
    texto: 'Mide tu progreso exacto en cada intento.',
  },
  {
    icono: Video,
    titulo: 'Clases Prácticas',
    texto: 'Resolución en pizarra de los problemas más difíciles.',
  },
];

export default function HomePage() {
  const instituciones = [
    { nombre: 'FAE', slug: 'fae', imagen: '/fae-background.jpg' },
    { nombre: 'Armada', slug: 'armada', imagen: '/armada-background.jpg' },
    { nombre: 'Ejército', slug: 'ejercito', imagen: '/ejercito-background.jpg' },
    { nombre: 'Policía', slug: 'policia', imagen: '/policia-background.jpg' },
  ];

  return (
    <div>
      <section className="relative -mt-8 overflow-hidden bg-slate-950 text-white sm:-mt-12">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-[#0B3A82] to-slate-900" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,193,7,0.22),transparent_42%)]" />
        <div className="relative main-container flex flex-col items-center py-20 text-center md:py-28">
          <div className="mb-8 flex items-center gap-3 rounded-full border border-white/15 bg-white/10 px-4 py-2 backdrop-blur-sm">
            <svg className="h-10 w-10" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M50 10 L 90 35 L 90 75 L 50 95 L 10 75 L 10 35 Z" fill="#1e293b" />
              <path d="M30 40 L 50 28 L 70 40" stroke="#FFD700" strokeWidth="10" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M30 58 L 50 46 L 70 58" stroke="#3b82f6" strokeWidth="10" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M30 76 L 50 64 L 70 76" stroke="#ef4444" strokeWidth="10" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="text-lg font-extrabold tracking-wide text-white">Ecuaforma</span>
          </div>

          <h1 className="max-w-4xl text-4xl font-extrabold leading-tight text-white md:text-6xl">
            Tu ingreso a las escuelas militares empieza aquí
          </h1>
          <p className="mt-6 max-w-3xl text-lg text-slate-200 md:text-xl">
            Domina las pruebas de física, matemáticas y razonamiento con simuladores exactos y clases guiadas paso a paso.
          </p>

          <div className="mt-10 flex w-full flex-col justify-center gap-4 sm:w-auto sm:flex-row">
            <Link
              href="/cursos"
              className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-8 py-4 text-lg font-bold text-white shadow-lg transition-colors duration-300 hover:bg-blue-500"
            >
              Explorar Cursos
            </Link>
            <Link
              href="/simuladores"
              className="inline-flex items-center justify-center rounded-lg border-2 border-white/80 bg-transparent px-8 py-4 text-lg font-bold text-white shadow-lg transition-colors duration-300 hover:bg-white hover:text-slate-950"
            >
              Rendir Simulador Gratuito
            </Link>
          </div>
        </div>
      </section>

      <section className="main-container py-16">
        <h2 className="mb-10 text-center text-3xl font-bold text-gray-800">Por qué prepararte en Ecuaforma</h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {beneficios.map((beneficio) => (
            <article key={beneficio.titulo} className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-primary">
                <beneficio.icono className="h-6 w-6" aria-hidden="true" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">{beneficio.titulo}</h3>
              <p className="mt-3 text-text-secondary">{beneficio.texto}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="main-container py-16">
        <h2 className="mb-12 text-center text-3xl font-bold text-gray-800">Nuestras Instituciones</h2>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {instituciones.map((inst) => (
            <Link
              key={inst.slug}
              href={`/simuladores/${inst.slug}`}
              className="group relative block h-64 transform overflow-hidden rounded-2xl shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl md:h-80"
            >
              <div
                className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110"
                style={{ backgroundImage: `url(${inst.imagen})` }}
              />
              <div className="absolute inset-0 bg-black bg-opacity-40 transition-all duration-300 group-hover:bg-opacity-50" />
              <div className="absolute inset-0 flex flex-col justify-end p-6 text-white">
                <h3 className="mb-2 text-2xl font-bold text-white md:text-3xl">{inst.nombre}</h3>
                <p className="mb-4 text-sm text-gray-100 opacity-90 transition-opacity group-hover:opacity-100 md:text-base">
                  Prepárate para las pruebas específicas.
                </p>
                <div className="flex items-center font-semibold text-accent transition-colors group-hover:text-white">
                  Ir a simuladores{' '}
                  <ArrowRight className="ml-2 inline h-5 w-5 transform transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
