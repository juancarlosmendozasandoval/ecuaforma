import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import Link from 'next/link';
import Breadcrumbs from '../../../../components/Breadcrumbs';
import { PlayCircle, FileText, CheckSquare, ArrowLeft, ArrowRight, ListVideo, CheckCircle } from 'lucide-react';

// Función para transformar URLs de YouTube a formato Embed
function getYouTubeEmbedUrl(url: string) {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? `https://www.youtube.com/embed/${match[2]}` : null;
}

export default async function AulaVirtualPage({ params }: { params: { institucion: string, slug: string, leccionId: string } }) {
  const cookieStore = cookies();
  const supabase = createServerComponentClient({ cookies: () => cookieStore });

  // 1. Traer datos del Curso
  const { data: curso } = await supabase.from('cursos').select('*').eq('slug', params.slug).single();
  
  if (!curso) return <div className="p-10 text-center">Curso no encontrado.</div>;

  // 2. Traer todas las lecciones para armar el menú lateral y la navegación
  const { data: lecciones } = await supabase
    .from('lecciones')
    .select('id, titulo, orden')
    .eq('curso_id', curso.id)
    .order('orden', { ascending: true });

  // 3. 🌟 CORRECCIÓN: Traer la lección de forma pura para evitar fallos por falta de llaves foráneas
  const { data: leccionActual } = await supabase
    .from('lecciones')
    .select('*')
    .eq('id', params.leccionId)
    .single();

  if (!leccionActual) return <div className="p-10 text-center">Lección no encontrada.</div>;

  // 4. 🌟 CORRECCIÓN: Consultar el slug del simulador de forma independiente si existe un ID vinculado
  let simuladorSlug = null;
  if (leccionActual.simulador_id) {
    const { data: simData } = await supabase
      .from('simuladores')
      .select('slug')
      .eq('id', leccionActual.simulador_id)
      .single();
    
    if (simData) {
      simuladorSlug = simData.slug;
    }
  }

  // Calcular lección anterior y siguiente
  const currentIndex = lecciones?.findIndex(l => l.id === leccionActual.id) ?? 0;
  const prevLeccion = currentIndex > 0 ? lecciones![currentIndex - 1] : null;
  const nextLeccion = currentIndex < (lecciones?.length || 0) - 1 ? lecciones![currentIndex + 1] : null;

  const embedUrl = getYouTubeEmbedUrl(leccionActual.video_url);

  const breadcrumbs = [
    { label: 'Inicio', href: '/' },
    { label: `Cursos ${curso.institucion}`, href: `/cursos/${params.institucion}` },
    { label: curso.nombre, href: `/cursos/${params.institucion}/${params.slug}` },
    { label: `Módulo ${leccionActual.orden}`, href: '#', isActive: true }
  ];

  return (
    <div className="main-container py-6 min-h-screen bg-gray-50/50">
      <Breadcrumbs items={breadcrumbs} />

      <div className="flex flex-col lg:flex-row gap-6 mt-4">
        
        {/* COLUMNA PRINCIPAL: REPRODUCTOR Y CONTENIDO */}
        <div className="lg:w-3/4 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            
            {/* Reproductor de Video */}
            {embedUrl ? (
              <div className="relative w-full pb-[56.25%] bg-black">
                <iframe 
                  src={embedUrl} 
                  className="absolute top-0 left-0 w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                  allowFullScreen
                ></iframe>
              </div>
            ) : leccionActual.video_url ? (
              <div className="p-10 text-center bg-gray-100">
                <a href={leccionActual.video_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-bold">
                  Ver Video Externo
                </a>
              </div>
            ) : null}

            {/* Cabecera de la Clase */}
            <div className="p-6 md:p-8 border-b border-gray-100">
              <span className="text-primary font-bold text-xs uppercase tracking-wider mb-2 block">
                Módulo {leccionActual.orden}
              </span>
              <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900">
                {leccionActual.titulo}
              </h1>
            </div>

            {/* Texto y Teoría */}
            {leccionActual.contenido_texto && (
              <div className="p-6 md:p-8 text-gray-700 leading-relaxed whitespace-pre-wrap">
                {leccionActual.contenido_texto}
              </div>
            )}

            {/* Botón de Examen si hay un simulador enlazado */}
            {simuladorSlug && (
              <div className="p-6 md:p-8 bg-emerald-50 border-t border-emerald-100 flex flex-col items-center text-center">
                <CheckSquare className="w-12 h-12 text-emerald-500 mb-3" />
                <h3 className="text-lg font-bold text-emerald-900 mb-2">Examen del Módulo</h3>
                <p className="text-sm text-emerald-700 mb-4 max-w-md">
                  Pon a prueba los conocimientos adquiridos en esta lección. Necesitarás aprobar para asegurar tu progreso.
                </p>
                <Link 
                  href={`/simulador/${simuladorSlug}`}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-xl font-bold shadow-md transition-all transform hover:-translate-y-1"
                >
                  Rendir Examen Ahora
                </Link>
              </div>
            )}
          </div>

          {/* Navegación Inferior (Anterior / Siguiente) */}
          <div className="flex items-center justify-between gap-4 pt-4">
            {prevLeccion ? (
              <Link href={`/cursos/${params.institucion}/${params.slug}/${prevLeccion.id}`} className="flex items-center gap-2 px-5 py-3 bg-white border border-gray-200 rounded-xl font-bold text-gray-600 hover:text-primary hover:border-primary transition-colors">
                <ArrowLeft size={18} /> Anterior
              </Link>
            ) : <div></div>}

            {nextLeccion ? (
              <Link href={`/cursos/${params.institucion}/${params.slug}/${nextLeccion.id}`} className="flex items-center gap-2 px-5 py-3 bg-primary text-white rounded-xl font-bold hover:bg-blue-700 shadow-md transition-colors">
                Siguiente Módulo <ArrowRight size={18} />
              </Link>
            ) : (
              <div className="px-5 py-3 bg-green-100 text-green-800 font-bold rounded-xl flex items-center gap-2">
                <CheckCircle size={18}/> Curso Completado
              </div>
            )}
          </div>
        </div>

        {/* COLUMNA LATERAL: PLAYLIST DEL CURSO */}
        <div className="lg:w-1/4">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 sticky top-6">
            <div className="p-4 bg-slate-900 text-white rounded-t-2xl flex items-center gap-2">
              <ListVideo className="w-5 h-5"/>
              <h3 className="font-bold">Contenido del Curso</h3>
            </div>
            <div className="max-h-[600px] overflow-y-auto divide-y divide-gray-50">
              {lecciones?.map((lec, idx) => {
                const isActive = lec.id === leccionActual.id;
                return (
                  <Link 
                    key={lec.id} 
                    href={`/cursos/${params.institucion}/${params.slug}/${lec.id}`}
                    className={`block p-4 transition-colors border-l-4 ${isActive ? 'bg-blue-50 border-primary' : 'hover:bg-gray-50 border-transparent'}`}
                  >
                    <span className={`text-xs font-bold block mb-1 ${isActive ? 'text-primary' : 'text-gray-400'}`}>
                      Clase {idx + 1}
                    </span>
                    <h4 className={`text-sm font-medium leading-tight ${isActive ? 'text-blue-900 font-bold' : 'text-gray-600'}`}>
                      {lec.titulo}
                    </h4>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}