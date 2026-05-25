import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import Link from 'next/link'; // 🌟 Esta es la línea que faltaba
import Card from '../../components/Card';
import Breadcrumbs from '../../components/Breadcrumbs';

export default async function CursosInstitucionPage({ params }: { params: { institucion: string } }) {
  const cookieStore = cookies();
  const supabase = createServerComponentClient({ cookies: () => cookieStore });

  const decodedInstitucion = decodeURIComponent(params.institucion);

  // Mapeo idéntico al que usas en simuladores
  const mapping: { [key: string]: string } = {
    'fae': 'FAE',
    'armada': 'Armada',
    'ejercito': 'Ejército',
    'ejército': 'Ejército',
    'policia': 'Policía',
    'policía': 'Policía'
  };

  const nombreReal = mapping[decodedInstitucion.toLowerCase()] || decodedInstitucion;

  // Consultar cursos de esta institución que estén activos y públicos
  const { data: cursos, error } = await supabase
    .from('cursos')
    .select('*')
    .eq('institucion', nombreReal)
    .eq('publico', true)
    .eq('is_deleted', false);

  if (error || !cursos) {
    return <div className="main-container py-10"><p>No se encontraron cursos para esta institución.</p></div>;
  }

  const breadcrumbs = [
    { label: 'Inicio', href: '/' },
    { label: `Cursos ${nombreReal}`, href: `/cursos/${params.institucion}`, isActive: true }
  ];

  return (
    <div className="main-container py-10 min-h-screen bg-gray-50/50">
      <Breadcrumbs items={breadcrumbs} />
      
      <div className="mb-8 mt-4">
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
          📚 Academia Digital: {nombreReal}
        </h1>
        <p className="text-gray-500 mt-2">
          Selecciona un curso especializado para iniciar tu preparación integral.
        </p>
      </div>

      {cursos.length === 0 ? (
        <div className="bg-white p-8 rounded-xl border border-gray-100 text-center text-gray-500">
          Próximamente se habilitarán los módulos multimedia para esta rama.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cursos.map(curso => (
            <div key={curso.id} className="flex flex-col bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition group">
              <span className="text-[10px] font-bold uppercase bg-blue-50 text-blue-600 px-2.5 py-1 rounded-md w-fit mb-3">
                {curso.institucion}
              </span>
              <h3 className="text-lg font-bold text-gray-800 group-hover:text-primary transition-colors">
                {curso.nombre}
              </h3>
              <p className="text-sm text-gray-500 mt-2 line-clamp-2 flex-1">
                {curso.descripcion}
              </p>
              <Link 
                href={`/cursos/${params.institucion}/${curso.slug}`}
                className="mt-5 w-full bg-slate-900 hover:bg-slate-800 text-white text-center py-2.5 rounded-xl font-bold text-sm transition shadow-sm"
              >
                Empezar Curso
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}