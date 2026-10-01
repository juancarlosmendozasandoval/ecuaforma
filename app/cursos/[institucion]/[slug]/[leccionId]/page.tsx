'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import Breadcrumbs from '../../../../components/Breadcrumbs';
import Simulator from '../../../../components/Simulator';
import { FileText, CheckSquare, ArrowLeft, ArrowRight, ListVideo, CheckCircle, X, Loader2, Circle, DownloadCloud, ExternalLink } from 'lucide-react';
import type { SimulatorType, QuestionType } from '../../../../simulador/[slug]/page';
import { mapearPreguntasExamen } from '@/lib/simuladores/preguntasDeExamen';
import { useSupabase } from '../../../../components/AuthProvider';
import type { Tables } from '@/types/supabase';

// 🌟 IMPORTACIONES PARA TEXTO ENRIQUECIDO Y MATEMÁTICAS
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
// @ts-ignore
import 'katex/dist/katex.min.css';

type LeccionBanco = Tables<'banco_lecciones'>;
type Modulo = Pick<Tables<'modulos_curso'>, 'id' | 'titulo' | 'orden'>;

/** Fila de `contenido_modulos` (el ID que viaja en la URL) con su lección del banco. */
type ContenidoLeccion = Pick<Tables<'contenido_modulos'>, 'id' | 'modulo_id' | 'orden' | 'titulo_mostrar' | 'is_preview'> & {
  banco_lecciones: LeccionBanco | null;
};

/** Elemento de la playlist lateral, ya ordenado por carpeta y por lección. */
type ItemPlaylist = ContenidoLeccion & { modulo: Modulo; numero: number };

type Adjunto = { titulo: string; url: string };

const SELECT_CONTENIDO =
  'id, modulo_id, orden, titulo_mostrar, is_preview, banco_lecciones ( id, titulo_interno, tipo, video_url, simulador_id, contenido_html, adjuntos, created_at )';

function getYouTubeEmbedUrl(url: string | null) {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? `https://www.youtube.com/embed/${match[2]}` : null;
}

const tituloLeccion = (item: ContenidoLeccion | null) =>
  item?.titulo_mostrar || item?.banco_lecciones?.titulo_interno || 'Clase sin título';

/** `\[ \]` pasa a bloque `$$` en su propia línea; `\( \)` pasa a fórmula en línea `$`. */
const normalizarLatex = (texto: string) =>
  texto
    .replace(/\\\[([\s\S]*?)\\\]/g, (_, formula) => `\n\n$$\n${(formula || '').trim()}\n$$\n\n`)
    .replace(/\\\(([\s\S]*?)\\\)/g, (_, formula) => `$${(formula || '').trim()}$`);

/**
 * `banco_lecciones.adjuntos` es texto: se acepta un JSON `[{ titulo, url }]`
 * o, como respaldo, una URL por línea.
 */
function parsearAdjuntos(valor: unknown): Adjunto[] {
  if (!valor) return [];
  let lista: unknown = valor;
  if (typeof valor === 'string') {
    try {
      lista = JSON.parse(valor);
    } catch {
      return valor
        .split('\n')
        .map((linea) => linea.trim())
        .filter((linea) => /^https?:\/\//i.test(linea))
        .map((url) => ({ titulo: '', url }));
    }
  }
  if (!Array.isArray(lista)) return [];
  return lista
    .map((a: any) => ({ titulo: a?.titulo || '', url: a?.url || '' }))
    .filter((a) => a.url);
}

export default function AulaVirtualPage({ params }: { params: { institucion: string, slug: string, leccionId: string } }) {
  const { user, supabase } = useSupabase();
  
  const [curso, setCurso] = useState<any>(null);
  const [lecciones, setLecciones] = useState<ItemPlaylist[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Estados para el Simulador
  const [mostrarSimulador, setMostrarSimulador] = useState(false);
  const [examenTerminado, setExamenTerminado] = useState(false);
  const [cargandoSimulador, setCargandoSimulador] = useState(false);
  const [simuladorData, setSimuladorData] = useState<{ sim: SimulatorType, pregs: QuestionType[] } | null>(null);

  // Estados para el Progreso (IDs de contenido_modulos)
  const [leccionesCompletadas, setLeccionesCompletadas] = useState<string[]>([]);
  const [isUpdatingProgress, setIsUpdatingProgress] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const progresoLock = useRef(false);

  // Temario: panel inferior en móvil, columna en escritorio
  const [temarioAbierto, setTemarioAbierto] = useState(false);
  const listaRef = useRef<HTMLDivElement>(null);
  const activoRef = useRef<HTMLAnchorElement>(null);

  // La lección visible sale de la lista ya cargada: cambiar de clase no vuelve a consultar la base
  const leccionActual = useMemo(
    () => lecciones.find((l) => l.id === params.leccionId) || null,
    [lecciones, params.leccionId]
  );

  useEffect(() => {
    setTemarioAbierto(false);
  }, [params.leccionId]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  // Centra la clase actual dentro de la lista (sin mover la página)
  useEffect(() => {
    const lista = listaRef.current;
    const activo = activoRef.current;
    if (!lista || !activo) return;
    const frame = requestAnimationFrame(() => {
      lista.scrollTop = Math.max(0, activo.offsetTop - lista.clientHeight / 2);
    });
    return () => cancelAnimationFrame(frame);
  }, [params.leccionId, lecciones.length, temarioAbierto]);

  // Bloquea el scroll del fondo mientras el examen o el temario móvil están abiertos
  useEffect(() => {
    const temarioEnMovil = temarioAbierto && window.matchMedia('(max-width: 1023px)').matches;
    if ((!mostrarSimulador && !temarioEnMovil) || typeof document === 'undefined' || !document.body) return;
    const anterior = document.body.style.overflow || '';
    document.body.style.overflow = 'hidden';
    return () => {
      if (document.body) document.body.style.overflow = anterior;
    };
  }, [mostrarSimulador, temarioAbierto]);

  useEffect(() => {
    let cancelado = false;

    const cargarEstructura = async () => {
      setLoading(true);

      // 1. Datos del Curso
      const { data: cursoData } = await supabase.from('cursos').select('*').eq('slug', params.slug).single();
      if (cancelado) return;
      setCurso(cursoData || null);
      if (!cursoData) {
        setLecciones([]);
        setLeccionesCompletadas([]);
        setLoading(false);
        return;
      }

      // 2. Carpetas del curso
      const { data: modulosData } = await supabase
        .from('modulos_curso')
        .select('id, titulo, orden')
        .eq('curso_id', cursoData.id)
        .order('orden', { ascending: true });
      const modulos = (modulosData || []) as Modulo[];

      // 3. Contenido de las carpetas + lección del banco
      let playlist: ItemPlaylist[] = [];
      if (modulos.length > 0) {
        const { data: contenidoData } = await supabase
          .from('contenido_modulos')
          .select(SELECT_CONTENIDO)
          .in('modulo_id', modulos.map((m) => m.id))
          .order('orden', { ascending: true });

        const contenido = ((contenidoData || []) as unknown as ContenidoLeccion[]).filter((c) => c.banco_lecciones);

        // Orden idéntico a la página del curso: carpeta por carpeta, lección por lección
        let numero = 0;
        playlist = modulos.flatMap((modulo) =>
          contenido
            .filter((c) => c.modulo_id === modulo.id)
            .map((c) => ({ ...c, modulo, numero: ++numero }))
        );
      }
      if (cancelado) return;
      setLecciones(playlist);

      // 4. Progreso del usuario limitado a las lecciones de este curso
      if (user?.id && playlist.length > 0) {
        const { data: progresoData } = await supabase
          .from('progreso_lecciones')
          .select('leccion_id')
          .eq('usuario_id', user.id)
          .in('leccion_id', playlist.map((l) => l.id));
        if (!cancelado) {
          setLeccionesCompletadas((progresoData || []).map((p: { leccion_id: string }) => p.leccion_id));
        }
      } else if (!cancelado) {
        setLeccionesCompletadas([]);
      }

      if (!cancelado) setLoading(false);
    };

    cargarEstructura();
    return () => { cancelado = true; };
  }, [params.slug, user?.id, supabase]);

  const banco = leccionActual?.banco_lecciones || null;

  const iniciarExamen = async () => {
    if (!banco?.simulador_id) return;
    setCargandoSimulador(true);
    
    try {
      const { data: sim, error: simError } = await supabase.from('simuladores').select('*').eq('id', banco.simulador_id).single();
      if (simError || !sim) throw new Error('No se pudo cargar el simulador');

      const { data: vinculos, error: pregsError } = await supabase
        .from('simulador_preguntas')
        .select('orden, preguntas(*)')
        .eq('simulador_id', sim.id)
        .order('orden', { ascending: true });
      if (pregsError) throw new Error('No se pudieron cargar las preguntas');

      setSimuladorData({ sim: sim as SimulatorType, pregs: mapearPreguntasExamen<QuestionType>(vinculos) });
      setExamenTerminado(false);
      setMostrarSimulador(true);
      
    } catch (error) {
      console.error("Error al cargar el examen:", error);
      alert("Hubo un problema al cargar el examen. Por favor, inténtalo de nuevo.");
    } finally {
      setCargandoSimulador(false);
    }
  };

  /**
   * Marca o desmarca la lección al instante y luego confirma en `progreso_lecciones`.
   * Si la base de datos rechaza el cambio, se restaura la lista anterior.
   */
  const toggleProgreso = async () => {
    if (!user) {
      setToast('Debes iniciar sesión para guardar tu progreso.');
      return;
    }
    if (!leccionActual || progresoLock.current) return;

    const contenidoId = leccionActual.id;
    const anterior = leccionesCompletadas;
    const yaCompletada = anterior.includes(contenidoId);

    progresoLock.current = true;
    setIsUpdatingProgress(true);
    setLeccionesCompletadas(yaCompletada ? anterior.filter((id) => id !== contenidoId) : [...anterior, contenidoId]);

    const { error } = yaCompletada
      ? await supabase.from('progreso_lecciones').delete().eq('usuario_id', user.id).eq('leccion_id', contenidoId)
      : await supabase.from('progreso_lecciones').insert({ usuario_id: user.id, leccion_id: contenidoId });

    progresoLock.current = false;
    setIsUpdatingProgress(false);

    // 23505: la fila ya existía; el estado optimista (completada) coincide con la base
    if (error && error.code !== '23505') {
      console.error('Error actualizando progreso:', error.code);
      setLeccionesCompletadas(anterior);
      setToast('No se pudo guardar tu progreso. Inténtalo de nuevo.');
    }
  };

  if (!loading && (!curso || !leccionActual || !banco)) return <div className="p-10 text-center">Contenido no encontrado.</div>;

  const currentIndex = leccionActual ? lecciones.findIndex(l => l.id === leccionActual.id) : -1;
  const prevLeccion = currentIndex > 0 ? lecciones[currentIndex - 1] : null;
  const nextLeccion = currentIndex >= 0 && currentIndex < lecciones.length - 1 ? lecciones[currentIndex + 1] : null;
  const pendientes = lecciones.filter((l) => !leccionesCompletadas.includes(l.id)).length;
  const embedUrl = getYouTubeEmbedUrl(banco?.video_url || null);
  const isActualCompleted = !!(leccionActual && leccionesCompletadas.includes(leccionActual.id));
  const adjuntos = parsearAdjuntos(banco?.adjuntos);
  const contenidoTexto = banco?.contenido_html || '';
  const nombreModulo = leccionActual?.modulo?.titulo || 'Módulo';

  const breadcrumbs = [
    { label: 'Inicio', href: '/' },
    { label: `Cursos ${curso?.institucion || ''}`, href: `/cursos/${params.institucion}` },
    { label: curso?.nombre || '', href: `/cursos/${params.institucion}/${params.slug}` },
    { label: nombreModulo }
  ];

  return (
    <div className="main-container py-2 sm:py-6 min-h-screen bg-gray-50/50 relative">
      {toast && (
        <div className="fixed bottom-4 inset-x-4 sm:left-auto sm:right-4 z-[80] bg-rose-600 text-white p-4 rounded-xl shadow-xl text-sm font-semibold" role="status">
          {toast}
        </div>
      )}
      
      {mostrarSimulador && simuladorData && (
        <div className="fixed inset-0 z-[100] bg-white overflow-y-auto overscroll-contain" role="dialog" aria-modal="true" aria-label="Examen del módulo">
          <button 
            onClick={() => {
                if (!examenTerminado && !window.confirm('¿Estás seguro de salir? Perderás el progreso de este intento.')) return;
                setExamenTerminado(false);
                setMostrarSimulador(false);
            }}
            className="fixed top-4 right-4 z-[60] bg-gray-900 text-white p-3 rounded-full hover:bg-rose-600 transition-colors shadow-lg flex items-center gap-2 font-bold text-sm"
          >
            <X size={20} /> Salir del Examen
          </button>
          <div className="pt-16 pb-10">
            <Simulator
              initialSimulator={simuladorData.sim}
              initialQuestions={simuladorData.pregs}
              onFinish={(score) => {
                setExamenTerminado(true);
                if (score >= 70 && leccionActual && !leccionesCompletadas.includes(leccionActual.id)) {
                  toggleProgreso();
                }
              }}
              onExit={() => {
                setExamenTerminado(false);
                setMostrarSimulador(false);
              }}
            />
          </div>
        </div>
      )}

      <div className={mostrarSimulador ? 'hidden' : 'block'}>
        <Breadcrumbs items={breadcrumbs} />

        <div className="flex flex-col lg:flex-row gap-6 mt-4">
          
          {/* COLUMNA PRINCIPAL */}
          <div className="lg:w-3/4 space-y-6">
            {loading ? (
              <div className="lg:hidden h-12 bg-slate-200 rounded-xl animate-pulse" />
            ) : (
            <button
              type="button"
              onClick={() => setTemarioAbierto(true)}
              className="lg:hidden sticky top-20 z-30 w-full px-4 py-3 bg-white/95 backdrop-blur border border-gray-200 rounded-xl shadow-sm flex items-center justify-between gap-3"
            >
              <span className="flex items-center gap-2 min-w-0 text-sm font-bold text-gray-800">
                <ListVideo className="w-5 h-5 text-primary shrink-0" />
                <span className="truncate">Clase {leccionActual?.numero || 0} de {lecciones.length}</span>
              </span>
              <span className="text-xs font-bold text-indigo-600 shrink-0">Ver temario</span>
            </button>
            )}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              {loading ? (
                <div className="animate-pulse space-y-4 p-4 md:p-6">
                  <div className="aspect-video bg-slate-200 rounded-2xl" />
                  <div className="h-3 bg-slate-200 rounded w-1/4" />
                  <div className="h-8 bg-slate-200 rounded w-2/3" />
                  <div className="space-y-2 pt-2">
                    <div className="h-4 bg-slate-200 rounded" />
                    <div className="h-4 bg-slate-200 rounded w-11/12" />
                    <div className="h-4 bg-slate-200 rounded w-4/5" />
                  </div>
                </div>
              ) : (
              <>
              {embedUrl ? (
                <div key={leccionActual?.id || 'video'} className="aspect-video bg-black sm:rounded-2xl rounded-none w-full overflow-hidden">
                  <iframe src={embedUrl} title={leccionActual?.banco_lecciones?.titulo_interno || ''} loading="lazy" className="w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen></iframe>
                </div>
              ) : banco?.video_url ? (
                <div className="p-10 text-center bg-gray-100">
                  <a href={banco?.video_url || '#'} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-bold">Ver Video Externo</a>
                </div>
              ) : null}

              <div className="p-6 md:p-8 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="text-primary font-bold text-xs uppercase tracking-wider mb-2 block">
                    {nombreModulo} · Clase {leccionActual?.numero || ''}
                  </span>
                  <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900">{tituloLeccion(leccionActual)}</h1>
                </div>

                <button 
                  onClick={toggleProgreso}
                  disabled={isUpdatingProgress}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm border ${
                    isActualCompleted 
                      ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' 
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {isUpdatingProgress ? <Loader2 className="w-4 h-4 animate-spin"/> : (
                    isActualCompleted ? <CheckCircle className="w-5 h-5 text-green-600"/> : <Circle className="w-5 h-5 text-gray-400"/>
                  )}
                  {isActualCompleted ? 'Completado' : 'Marcar como completado'}
                </button>
              </div>

              {/* 🌟 MOTOR DE RENDERIZADO AVANZADO (MARKDOWN + MATEMÁTICAS) */}
              {contenidoTexto && (
                <article className="prose prose-slate max-w-3xl mx-auto px-5 py-6 sm:prose-lg">
                  <ReactMarkdown
                    remarkPlugins={[remarkMath]}
                    rehypePlugins={[rehypeKatex]}
                    components={{
                      a: ({ node, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer" />,
                    }}
                  >
                    {normalizarLatex(contenidoTexto)}
                  </ReactMarkdown>
                </article>
              )}

              {/* 🌟 RECURSOS ADICIONALES (ADJUNTOS) */}
              {adjuntos.length > 0 && (
                <div className="p-6 md:p-8 bg-slate-50 border-t border-slate-100">
                  <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <DownloadCloud className="w-5 h-5"/> Material Adicional Descargable
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {adjuntos.map((adjunto, idx) => {
                      let etiqueta = adjunto.titulo || '';
                      if (!etiqueta) {
                        try {
                          etiqueta = new URL(adjunto.url).hostname;
                        } catch {
                          etiqueta = `Archivo Adjunto ${idx + 1}`;
                        }
                      }
                      return (
                      <a 
                        key={idx} 
                        href={adjunto.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 min-h-[56px] p-3 bg-white border border-slate-200 rounded-xl hover:border-primary hover:shadow-md active:scale-[0.98] active:bg-slate-50 transition-all group"
                      >
                        <div className="shrink-0 bg-blue-50 text-blue-600 p-2 rounded-lg group-hover:bg-primary group-hover:text-white transition-colors">
                          <FileText size={20} />
                        </div>
                        <span className="flex-1 min-w-0 font-semibold text-slate-700 text-sm group-hover:text-primary transition-colors line-clamp-2 break-words">
                          {etiqueta}
                        </span>
                        <ExternalLink size={16} className="shrink-0 text-slate-400" />
                      </a>
                      );
                    })}
                  </div>
                </div>
              )}

              {banco?.simulador_id && (
                <div className="p-6 md:p-8 bg-emerald-50 border-t border-emerald-100 flex flex-col items-center text-center">
                  <CheckSquare className="w-12 h-12 text-emerald-500 mb-3" />
                  <h3 className="text-lg font-bold text-emerald-900 mb-2">Examen del Módulo</h3>
                  <p className="text-sm text-emerald-700 mb-5 max-w-md">Pon a prueba los conocimientos adquiridos en esta lección. Necesitarás aprobar para asegurar tu progreso.</p>
                  <button 
                    onClick={iniciarExamen}
                    disabled={cargandoSimulador}
                    className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white px-8 py-3 rounded-xl font-bold shadow-md transition-all transform hover:-translate-y-1 flex items-center gap-2"
                  >
                    {cargandoSimulador ? <><Loader2 className="w-5 h-5 animate-spin" /> Cargando examen...</> : "Rendir Examen Ahora"}
                  </button>
                </div>
              )}
              </>
              )}
            </div>

            {!loading && (
            <div className="grid grid-cols-2 gap-3 pt-4">
              {prevLeccion ? (
                <Link href={`/cursos/${params.institucion}/${params.slug}/${prevLeccion.id}`} className="min-w-0 flex items-center gap-2 p-3 sm:px-5 bg-white border border-gray-200 rounded-xl text-gray-600 hover:border-primary active:bg-gray-50 transition-colors">
                  <ArrowLeft size={18} className="shrink-0" />
                  <span className="min-w-0 text-left">
                    <span className="block text-[11px] font-bold uppercase text-gray-400">Anterior</span>
                    <span className="block truncate text-sm font-semibold">{tituloLeccion(prevLeccion)}</span>
                  </span>
                </Link>
              ) : <div />}
              {nextLeccion ? (
                <Link href={`/cursos/${params.institucion}/${params.slug}/${nextLeccion.id}`} className="min-w-0 flex items-center justify-end gap-2 p-3 sm:px-5 bg-primary text-white rounded-xl font-bold shadow-md hover:bg-blue-700 active:scale-[0.98] transition-colors">
                  <span className="min-w-0 text-right">
                    <span className="block text-[11px] font-bold uppercase text-blue-200">Siguiente clase</span>
                    <span className="block truncate text-sm font-semibold">{tituloLeccion(nextLeccion)}</span>
                  </span>
                  <ArrowRight size={18} className="shrink-0" />
                </Link>
              ) : pendientes === 0 ? (
                <div className="flex items-center justify-center gap-2 p-3 bg-green-100 text-green-800 font-bold rounded-xl">
                  <CheckCircle size={18}/> Curso completado
                </div>
              ) : (
                <Link href={`/cursos/${params.institucion}/${params.slug}`} className="flex items-center justify-center p-3 bg-amber-50 text-amber-800 border border-amber-200 font-bold rounded-xl text-sm text-center hover:bg-amber-100 transition-colors">
                  Te faltan {pendientes} clase(s)
                </Link>
              )}
            </div>
            )}
          </div>

          {/* COLUMNA LATERAL: panel inferior en móvil, columna fija en escritorio */}
          <aside
            className={`${temarioAbierto ? 'fixed inset-0 z-[70] flex flex-col' : 'hidden'} lg:sticky lg:top-24 lg:inset-auto lg:z-auto lg:flex lg:w-1/4 lg:flex-col lg:self-start lg:max-h-[calc(100vh-8rem)]`}
            aria-label="Temario del curso"
          >
            <div
              className="absolute inset-0 bg-slate-900/50 lg:hidden"
              onClick={() => setTemarioAbierto(false)}
            />
            <div className="relative mt-auto flex min-h-0 w-full max-h-[85vh] flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl motion-safe:animate-[fadeIn_0.2s_ease-out] lg:mt-0 lg:max-h-full lg:animate-none lg:rounded-2xl lg:border lg:border-gray-100 lg:shadow-sm">
              <div className="p-4 bg-slate-900 text-white rounded-t-2xl flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <ListVideo className="w-5 h-5"/>
                  <h3 className="font-bold">Contenido</h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs bg-slate-800 px-2 py-1 rounded-md font-bold text-indigo-300">
                    {leccionesCompletadas.length} / {lecciones.length}
                  </span>
                  <button
                    type="button"
                    onClick={() => setTemarioAbierto(false)}
                    className="lg:hidden p-1.5 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white"
                    aria-label="Cerrar temario"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div ref={listaRef} className="flex-1 min-h-0 overflow-y-auto">
                {lecciones.map((lec, idx) => {
                  const isActive = lec.id === leccionActual?.id;
                  const isCompleted = leccionesCompletadas.includes(lec.id);
                  // Encabezado cuando empieza una nueva carpeta
                  const mostrarHeaderModulo = idx === 0 || lecciones[idx - 1].modulo.id !== lec.modulo.id;
                  
                  return (
                    <div key={lec.id}>
                      {/* 🌟 HEADER DE LA CARPETA */}
                      {mostrarHeaderModulo && (
                        <div className="bg-indigo-50/80 border-y border-indigo-100 px-4 py-2 mt-2 first:mt-0 sticky top-0 z-10 backdrop-blur-sm">
                          <h4 className="text-[10px] font-extrabold text-indigo-800 uppercase tracking-wider">
                            {lec.modulo?.titulo || 'Módulo Principal'}
                          </h4>
                        </div>
                      )}

                      <Link 
                        ref={isActive ? activoRef : undefined}
                        href={`/cursos/${params.institucion}/${params.slug}/${lec.id}`}
                        aria-current={isActive ? 'page' : undefined}
                        className={`block p-4 transition-colors border-l-4 border-b border-b-gray-50 ${isActive ? 'bg-blue-50 border-l-primary' : 'hover:bg-gray-50 border-l-transparent'} flex items-start gap-3`}
                      >
                        <div className="mt-0.5 shrink-0">
                          {isCompleted ? (
                            <CheckCircle className="w-5 h-5 text-green-500" />
                          ) : (
                            <div className="w-5 h-5 rounded-full border-2 border-gray-300"></div>
                          )}
                        </div>
                        
                        <div>
                          <span className={`text-xs font-bold block mb-0.5 ${isActive ? 'text-primary' : 'text-gray-400'}`}>
                            Clase {lec.numero}
                          </span>
                          <h4 className={`text-sm leading-tight ${isActive ? 'text-blue-900 font-bold' : 'text-gray-600 font-medium'}`}>
                            {tituloLeccion(lec)}
                          </h4>
                        </div>
                      </Link>
                    </div>
                  );
                })}
              </div>
            </div>
          </aside>

        </div>
      </div>
    </div>
  );
}
