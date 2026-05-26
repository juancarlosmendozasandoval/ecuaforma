import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import Link from 'next/link';
import Card from '../../components/Card';
import Breadcrumbs from '../../components/Breadcrumbs';

export default async function CursosInstitucionPage({ params }: { params: { institucion: string } }) {
  const cookieStore = cookies();
  const supabase = createServerComponentClient({ cookies: () => cookieStore });

  // 1. Obtener el usuario actual si está logueado
  const { data: { user } } = await supabase.auth.getUser();

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

  // 2. Construir la consulta base de cursos activos para esta institución
  let query = supabase
    .from('cursos')
    .select('*')
    .eq('institucion', nombreReal)
    .eq('is_deleted', false);

  // 3. 🌟 APLICAR FILTRO DE PERMISOS
  if (!user) {
    // Si no está logueado, solo ve cursos 100% públicos
    query = query.eq('publico', true);
  } else {
    // Si está logueado, buscamos a qué cursos privados tiene acceso
    const { data: accessData } = await supabase
      .from('accesos_cursos')
      .select('curso_id')
      .eq('usuario_id', user.id);
    
    const accessibleCourseIds = accessData ? accessData.map(a => a.curso_id) : [];

    if (accessibleCourseIds.length > 0) {
      // Ve los públicos OR los privados que tengan su ID asignado en la tabla de accesos
      query = query.or(`publico.eq.true,id.in.(${accessibleCourseIds.join(',')})`);
    } else {
      // Si no tiene accesos asignados, solo ve públicos
      query = query.eq('publico', true);
    }
  }

  const { data: cursos, error } = await query;

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
              <div className="flex justify-between items-start mb-3">
                <span className="text-[10px] font-bold uppercase bg-blue-50 text-blue-600 px-2.5 py-1 rounded-md border border-blue-100">
                  {curso.institucion}
                </span>
                {/* Pequeño indicador si el curso es privado/premium */}
                {!curso.publico && (
                  <span className="text-[10px] font-bold uppercase bg-purple-50 text-purple-600 px-2.5 py-1 rounded-md border border-purple-100">
                    Premium ⭐
                  </span>
                )}
              </div>
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