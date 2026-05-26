'use client';

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Breadcrumbs from '../../../../components/Breadcrumbs';
import Simulator from '../../../../components/Simulator';
import { PlayCircle, FileText, CheckSquare, ArrowLeft, ArrowRight, ListVideo, CheckCircle, X, Loader2 } from 'lucide-react';
// Importamos los tipos necesarios (asegúrate de que la ruta relativa coincida con donde definiste estos tipos)
import type { SimulatorType, QuestionType } from '../../../../simulador/[slug]/page';

// Función para transformar URLs de YouTube a formato Embed
function getYouTubeEmbedUrl(url: string | null) {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? `https://www.youtube.com/embed/${match[2]}` : null;
}

export default function AulaVirtualPage({ params }: { params: { institucion: string, slug: string, leccionId: string } }) {
  const supabase = createClientComponentClient();
  
  const [curso, setCurso] = useState<any>(null);
  const [lecciones, setLecciones] = useState<any[]>([]);
  const [leccionActual, setLeccionActual] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Estados para el Simulador
  const [mostrarSimulador, setMostrarSimulador] = useState(false);
  const [cargandoSimulador, setCargandoSimulador] = useState(false);
  const [simuladorData, setSimuladorData] = useState<{ sim: SimulatorType, pregs: QuestionType[] } | null>(null);

  useEffect(() => {
    const cargarDatos = async () => {
      setLoading(true);

      // 1. Traer datos del Curso
      const { data: cursoData } = await supabase.from('cursos').select('*').eq('slug', params.slug).single();
      if (cursoData) setCurso(cursoData);

      // 2. Traer todas las lecciones
      if (cursoData) {
        const { data: leccionesData } = await supabase
          .from('lecciones')
          .select('id, titulo, orden')
          .eq('curso_id', cursoData.id)
          .order('orden', { ascending: true });
        if (leccionesData) setLecciones(leccionesData);
      }

      // 3. Traer la lección actual pura
      const { data: leccionData } = await supabase
        .from('lecciones')
        .select('*')
        .eq('id', params.leccionId)
        .single();
      
      if (leccionData) {
        setLeccionActual(leccionData);
      }

      setLoading(false);
    };

    cargarDatos();
  }, [params.slug, params.leccionId, supabase]);

  // Función para cargar los datos del simulador cuando el usuario decide rendirlo
  const iniciarExamen = async () => {
    if (!leccionActual?.simulador_id) return;
    
    setCargandoSimulador(true);
    
    try {
      // Fetch del simulador
      const { data: sim, error: simError } = await supabase
        .from('simuladores')
        .select('*')
        .eq('id', leccionActual.simulador_id)
        .single();
        
      if (simError || !sim) throw new Error('No se pudo cargar el simulador');

      // Fetch de las preguntas
      const { data: pregs, error: pregsError } = await supabase
        .from('preguntas')
        .select('*')
        .eq('simulador_id', sim.id)
        .order('orden', { ascending: true });

      if (pregsError) throw new Error('No se pudieron cargar las preguntas');

      setSimuladorData({ sim: sim as SimulatorType, pregs: pregs as QuestionType[] });
      setMostrarSimulador(true);
      
    } catch (error) {
      console.error("Error al cargar el examen:", error);
      alert("Hubo un problema al cargar el examen. Por favor, inténtalo de nuevo.");
    } finally {
      setCargandoSimulador(false);
    }
  };

  if (loading) return <div className="p-10 text-center animate-pulse text-indigo-500">Cargando el Aula Virtual...</div>;
  if (!curso || !leccionActual) return <div className="p-10 text-center">Contenido no encontrado.</div>;

  // Calcular navegación
  const currentIndex = lecciones.findIndex(l => l.id === leccionActual.id);
  const prevLeccion = currentIndex > 0 ? lecciones[currentIndex - 1] : null;
  const nextLeccion = currentIndex < lecciones.length - 1 ? lecciones[currentIndex + 1] : null;

  const embedUrl = getYouTubeEmbedUrl(leccionActual.video_url);

  const breadcrumbs = [
    { label: 'Inicio', href: '/' },
    { label: `Cursos ${curso.institucion}`, href: `/cursos/${params.institucion}` },
    { label: curso.nombre, href: `/cursos/${params.institucion}/${params.slug}` },
    { label: `Módulo ${leccionActual.orden}`, href: '#', isActive: true }
  ];

  return (
    <div className="main-container py-6 min-h-screen bg-gray-50/50 relative">
      
      {/* 🌟 EL MODAL DEL SIMULADOR A PANTALLA COMPLETA 🌟 */}
      {mostrarSimulador && simuladorData && (
        <div className="fixed inset-0 z-50 bg-white overflow-y-auto">
          {/* Botón flotante para cerrar el examen y volver al curso */}
          <button 
            onClick={() => {
                // Confirmación opcional para no perder progreso por accidente
                if(window.confirm('¿Estás seguro de salir? Perderás el progreso de este intento.')){
                    setMostrarSimulador(false);
                }
            }}
            className="fixed top-4 right-4 z-[60] bg-gray-900 text-white p-3 rounded-full hover:bg-rose-600 transition-colors shadow-lg flex items-center gap-2 font-bold text-sm"
          >
            <X size={20} /> Salir del Examen
          </button>

          {/* Incrustamos el componente de tu simulador original pasándole las props correctas */}
          <div className="pt-16 pb-10">
            <Simulator 
              initialSimulator={simuladorData.sim} 
              initialQuestions={simuladorData.pregs} 
            />
          </div>
        </div>
      )}

      {/* --- Contenido normal del Aula (oculto si el modal está activo para no distraer) --- */}
      <div className={mostrarSimulador ? 'hidden' : 'block'}>
        <Breadcrumbs items={breadcrumbs} />

        <div className="flex flex-col lg:flex-row gap-6 mt-4">
          
          {/* COLUMNA PRINCIPAL */}
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

              {/* Cabecera */}
              <div className="p-6 md:p-8 border-b border-gray-100">
                <span className="text-primary font-bold text-xs uppercase tracking-wider mb-2 block">
                  Módulo {leccionActual.orden}
                </span>
                <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900">
                  {leccionActual.titulo}
                </h1>
              </div>

              {/* Teoría */}
              {leccionActual.contenido_texto && (
                <div className="p-6 md:p-8 text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {leccionActual.contenido_texto}
                </div>
              )}

              {/* 🌟 BOTÓN QUE ABRE EL MODAL DEL EXAMEN */}
              {leccionActual.simulador_id && (
                <div className="p-6 md:p-8 bg-emerald-50 border-t border-emerald-100 flex flex-col items-center text-center">
                  <CheckSquare className="w-12 h-12 text-emerald-500 mb-3" />
                  <h3 className="text-lg font-bold text-emerald-900 mb-2">Examen del Módulo</h3>
                  <p className="text-sm text-emerald-700 mb-5 max-w-md">
                    Pon a prueba los conocimientos adquiridos en esta lección. Necesitarás aprobar para asegurar tu progreso.
                  </p>
                  
                  {/* El botón ahora ejecuta la función iniciarExamen que descarga los datos antes de abrir el modal */}
                  <button 
                    onClick={iniciarExamen}
                    disabled={cargandoSimulador}
                    className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white px-8 py-3 rounded-xl font-bold shadow-md transition-all transform hover:-translate-y-1 flex items-center gap-2"
                  >
                    {cargandoSimulador ? (
                      <><Loader2 className="w-5 h-5 animate-spin" /> Cargando examen...</>
                    ) : (
                      "Rendir Examen Ahora"
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Navegación Inferior */}
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

          {/* COLUMNA LATERAL: PLAYLIST */}
          <div className="lg:w-1/4">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 sticky top-6">
              <div className="p-4 bg-slate-900 text-white rounded-t-2xl flex items-center gap-2">
                <ListVideo className="w-5 h-5"/>
                <h3 className="font-bold">Contenido del Curso</h3>
              </div>
              <div className="max-h-[600px] overflow-y-auto divide-y divide-gray-50">
                {lecciones.map((lec, idx) => {
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
    </div>
  );
}