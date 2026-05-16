import Link from 'next/link';
import { Shield, BookOpen, ArrowRight } from 'lucide-react';

export default function HomePage() {
  // Lista de instituciones con su nombre visible, URL limpia y ruta de la imagen
  const instituciones = [
    { nombre: 'FAE', slug: 'fae', imagen: '/fae-background.jpg' },
    { nombre: 'Armada', slug: 'armada', imagen: '/armada-background.jpg' },
    { nombre: 'Ejército', slug: 'ejercito', imagen: '/ejercito-background.jpg' },
    { nombre: 'Policía', slug: 'policia', imagen: '/policia-background.jpg' }
  ];

  return (
    <div className="main-container">
      {/* Sección Hero - Principal */}
      <section className="text-center py-16 md:py-24">
        <h1 className="text-4xl md:text-6xl font-extrabold text-primary mb-4">
          Tu Futuro Empieza en Ecuaforma
        </h1>
        <p className="text-lg md:text-xl text-text-secondary max-w-3xl mx-auto mb-8">
          La mejor preparación para las pruebas de admisión de las Fuerzas Armadas y Policía Nacional del Ecuador.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Link href="/simuladores" className="inline-flex items-center justify-center px-8 py-4 bg-primary text-white font-bold rounded-lg shadow-lg hover:bg-secondary transition-colors duration-300">
            <Shield className="mr-2" />
            Ver Simuladores
          </Link>
          <Link href="/cursos" className="inline-flex items-center justify-center px-8 py-4 bg-accent text-primary font-bold rounded-lg shadow-lg hover:opacity-90 transition-opacity duration-300">
            <BookOpen className="mr-2" />
            Explorar Cursos
          </Link>
        </div>
      </section>

      {/* Sección Nuestras Instituciones - NUEVO DISEÑO ELEGANTE */}
      <section className="py-16">
        <h2 className="text-3xl font-bold text-center mb-12 text-gray-800">Nuestras Instituciones</h2>
        
        {/* Grid de tarjetas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 px-4 md:px-0">
          {instituciones.map((inst) => (
            <Link 
              key={inst.slug} 
              href={`/simuladores/${inst.slug}`}
              className="group relative h-64 md:h-80 rounded-2xl overflow-hidden shadow-md hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 block"
            >
              {/* 1. Imagen de Fondo */}
              <div 
                className="absolute inset-0 bg-cover bg-center group-hover:scale-110 transition-transform duration-500" 
                style={{ backgroundImage: `url(${inst.imagen})` }}
              ></div>

              {/* 2. Superposición Oscura (Overlay) para legibilidad */}
              <div className="absolute inset-0 bg-black bg-opacity-40 group-hover:bg-opacity-50 transition-all duration-300"></div>

              {/* 3. Contenido de Texto */}
              <div className="absolute inset-0 p-6 flex flex-col justify-end text-white">
                {/* ESTA ES LA LÍNEA CORREGIDA */}
                <h3 className="text-2xl md:text-3xl font-bold mb-2 text-white">
                  {inst.nombre}
                </h3>
                <p className="text-gray-100 text-sm md:text-base mb-4 opacity-90 group-hover:opacity-100 transition-opacity">
                  Prepárate para las pruebas específicas.
                </p>
                <div className="flex items-center font-semibold text-accent group-hover:text-white transition-colors">
                  Ir a simuladores <ArrowRight className="inline w-5 h-5 ml-2 transform group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}