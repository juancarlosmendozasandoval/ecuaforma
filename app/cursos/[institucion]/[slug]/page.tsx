import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import Breadcrumbs from '../../../components/Breadcrumbs';
import Link from 'next/link';
import { BookOpen, PlayCircle, FileText } from 'lucide-react';

export default async function DetalleCursoPage({ params }: { params: { institucion: string, slug: string } }) {
  const cookieStore = cookies();
  const supabase = createServerComponentClient({ cookies: () => cookieStore });

  // 1. Obtener detalles del curso
  const { data: curso } = await supabase
    .from('cursos')
    .select('*')
    .eq('slug', params.slug)
    .eq('is_deleted', false)
    .single();

  if (!curso) return <div className="p-10 text-center">Curso no encontrado.</div>;

  // 2. Obtener las lecciones ordenadas de este curso
  const { data: lecciones } = await supabase
    .from('lecciones')
    .select('*')
    .eq('curso_id', curso.id)
    .order('orden', { ascending: true });

  const breadcrumbs = [
    { label: 'Inicio', href: '/' },
    { label: `Cursos ${curso.institucion}`, href: `/cursos/${params.institucion}` },
    { label: curso.nombre, href: `/cursos/${params.institucion}/${params.slug}`, isActive: true }
  ];

  return (
    <div className="main-container py-10 min-h-screen bg-gray-50/50">
      <Breadcrumbs items={breadcrumbs} />
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-6">
        
        {/* Columna Izquierda: Información del Curso */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <h1 className="text-2xl font-black text-gray-800">{curso.nombre}</h1>
            <p className="text-sm text-gray-500 mt-2">{curso.descripcion}</p>
            <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400 font-medium">
              <span>Estructura de Progreso</span>
              <span className="font-bold text-slate-700">{lecciones?.length || 0} Lecciones</span>
            </div>
          </div>
        </div>

        {/* Columna Derecha: Temario e índice de Clases */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <BookOpen className="text-primary w-5 h-5"/> Índice de Contenidos
            </h2>

            {!lecciones || lecciones.length === 0 ? (
              <p className="text-gray-400 italic text-sm">Estamos subiendo las clases de esta materia. ¡Vuelve pronto!</p>
            ) : (
              <div className="space-y-3">
                {lecciones.map((lec, idx) => (
                  <div key={lec.id} className="flex items-center justify-between p-4 bg-gray-50 hover:bg-blue-50/40 rounded-xl transition group border border-transparent hover:border-blue-100">
                    <div className="flex items-center gap-4">
                      <span className="w-7 h-7 bg-white rounded-lg flex items-center justify-center font-bold text-xs text-gray-500 shadow-sm border border-gray-100">
                        {idx + 1}
                      </span>
                      <div>
                        <h4 className="text-sm font-bold text-gray-700 group-hover:text-primary transition-colors">
                          {lec.titulo}
                        </h4>
                        <span className="text-[11px] text-gray-400 flex items-center gap-1 mt-0.5">
                          {lec.video_url ? <><PlayCircle size={12}/> Video clase</> : <><FileText size={12}/> Material teórico</>}
                        </span>
                      </div>
                    </div>
                    
                    {/* Si la lección tiene un simulador enlazado, le damos acceso directo */}
                    {lec.simulador_id && (
                      <span className="text-xs bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-md font-bold">
                        Incluye Examen
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}