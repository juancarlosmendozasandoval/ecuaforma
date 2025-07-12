import Link from 'next/link';
import { Shield, BookOpen, ArrowRight } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="main-container">
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

      <section className="py-16">
        <h2 className="text-3xl font-bold text-center mb-10">Nuestras Instituciones</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {['FAE', 'Armada', 'Ejército', 'Policía'].map((inst) => (
            <div key={inst} className="bg-white p-8 rounded-xl shadow-md text-center hover:shadow-xl transition-shadow">
              <h3 className="text-2xl font-bold text-primary mb-4">{inst}</h3>
              <p className="text-text-secondary mb-6">Prepárate para las pruebas específicas de la institución.</p>
              <Link href={`/simuladores/${inst.toLowerCase()}`} className="font-semibold text-primary hover:text-secondary">
                Ir a simuladores <ArrowRight className="inline w-4 h-4" />
              </Link>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}