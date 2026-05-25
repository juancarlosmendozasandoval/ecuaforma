import Link from 'next/link';
import { ArrowRight, BookOpen } from 'lucide-react';

export default function CursosPage() {
  // Lista de instituciones con su nombre visible, URL limpia y ruta de la imagen
  const instituciones = [
    { nombre: 'FAE', slug: 'fae', imagen: '/fae-background.jpg' },
    { nombre: 'Armada', slug: 'armada', imagen: '/armada-background.jpg' },
    { nombre: 'Ejército', slug: 'ejercito', imagen: '/ejercito-background.jpg' },
    { nombre: 'Policía', slug: 'policia', imagen: '/policia-background.jpg' }
  ];

  return (
    <div className="main-container py-10 min-h-screen bg-gray-50/50">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-4 flex items-center justify-center gap-3">
          <BookOpen className="text-primary w-10 h-10" />
          Nuestros Cursos
        </h1>
        <p className="text-lg text-gray-500 max-w-2xl mx-auto">
          Selecciona tu institución objetivo y accede al temario completo estructurado paso a paso.
        </p>
      </div>

      {/* Grid de tarjetas de instituciones */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 px-4 md:px-0">
        {instituciones.map((inst) => (
          <Link 
            key={inst.slug} 
            href={`/cursos/${inst.slug}`}
            className="group relative h-64 md:h-80 rounded-2xl overflow-hidden shadow-md hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 block"
          >
            {/* Imagen de Fondo */}
            <div 
              className="absolute inset-0 bg-cover bg-center group-hover:scale-110 transition-transform duration-500" 
              style={{ backgroundImage: `url(${inst.imagen})` }}
            ></div>

            {/* Superposición Oscura (Overlay) */}
            <div className="absolute inset-0 bg-black bg-opacity-40 group-hover:bg-opacity-50 transition-all duration-300"></div>

            {/* Contenido de Texto */}
            <div className="absolute inset-0 p-6 flex flex-col justify-end text-white">
              <h3 className="text-2xl md:text-3xl font-bold mb-2 text-white">
                {inst.nombre}
              </h3>
              <p className="text-gray-100 text-sm md:text-base mb-4 opacity-90 group-hover:opacity-100 transition-opacity">
                Ver módulos y lecciones.
              </p>
              <div className="flex items-center font-semibold text-accent group-hover:text-white transition-colors">
                Explorar <ArrowRight className="inline w-5 h-5 ml-2 transform group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}