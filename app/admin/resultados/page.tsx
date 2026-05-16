import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import Link from 'next/link';

export default async function ResultadosIndexPage() {
  const cookieStore = cookies();
  const supabase = createServerComponentClient({ cookies: () => cookieStore });

  // Consultar todos los simuladores disponibles
  const { data: simuladores, error } = await supabase
    .from('simuladores')
    .select('id, nombre, institucion, slug')
    .order('institucion');

  if (error) {
    return <div className="p-10 text-red-500">Error al cargar los simuladores.</div>;
  }

  return (
    <div className="max-w-5xl mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
          📊 Panel de Calificaciones
        </h1>
        <p className="text-gray-500 mt-2">Selecciona el examen del cual quieres ver las notas y detalles de tus estudiantes.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {simuladores && simuladores.length > 0 ? (
          <ul className="divide-y divide-gray-100">
            {simuladores.map((sim) => (
              <li key={sim.id}>
                <Link 
                  href={`/admin/resultados/${sim.slug}`} 
                  className="flex items-center justify-between p-6 hover:bg-gray-50 transition-colors group"
                >
                  <div>
                    <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 text-xs font-bold rounded-full mb-2 uppercase">
                      {sim.institucion}
                    </span>
                    <h3 className="text-lg font-semibold text-gray-800 group-hover:text-primary transition-colors">
                      {sim.nombre}
                    </h3>
                  </div>
                  <div className="text-primary font-medium flex items-center gap-2 group-hover:translate-x-2 transition-transform">
                    Ver Notas
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="p-8 text-center text-gray-500">No hay simuladores creados todavía.</div>
        )}
      </div>
    </div>
  );
}