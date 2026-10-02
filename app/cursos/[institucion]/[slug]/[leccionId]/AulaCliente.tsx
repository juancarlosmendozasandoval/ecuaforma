'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Simulator from '../../../../components/Simulator';
import { FileText, CheckSquare, CheckCircle, X, Loader2, Circle, DownloadCloud, ExternalLink, PenTool } from 'lucide-react';
import type { SimulatorType, QuestionType } from '../../../../simulador/[slug]/page';
import { esApuntePizarra, parsearAdjuntos } from '@/lib/cursos/adjuntos';
import { cargarExamenLeccion } from './acciones';
import { useSupabase } from '../../../../components/AuthProvider';

import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
// @ts-ignore
import 'katex/dist/katex.min.css';

export type LeccionAula = {
  id: string;
  numero: number;
  titulo: string;
  moduloTitulo: string;
  videoUrl: string | null;
  simuladorId: string | null;
  contenidoHtml: string | null;
  adjuntos: string | null;
};

function getYouTubeEmbedUrl(url: string | null) {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? `https://www.youtube.com/embed/${match[2]}` : null;
}

/** `\[ \]` pasa a bloque `$$`; `\( \)` pasa a fórmula en línea `$`. */
const normalizarLatex = (texto: string) =>
  texto
    .replace(/\\\[([\s\S]*?)\\\]/g, (_, formula) => `\n\n$$\n${(formula || '').trim()}\n$$\n\n`)
    .replace(/\\\(([\s\S]*?)\\\)/g, (_, formula) => `$${(formula || '').trim()}$`);

export default function AulaCliente({
  leccion,
  completadaInicial,
}: {
  leccion: LeccionAula;
  completadaInicial: boolean;
}) {
  const router = useRouter();
  const { user, supabase } = useSupabase();

  const [mostrarSimulador, setMostrarSimulador] = useState(false);
  const [examenTerminado, setExamenTerminado] = useState(false);
  const [cargandoSimulador, setCargandoSimulador] = useState(false);
  const [simuladorData, setSimuladorData] = useState<{ sim: SimulatorType; pregs: QuestionType[] } | null>(null);
  const [completada, setCompletada] = useState(completadaInicial);
  const [isUpdatingProgress, setIsUpdatingProgress] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const progresoLock = useRef(false);

  useEffect(() => {
    setMostrarSimulador(false);
    setExamenTerminado(false);
    setSimuladorData(null);
  }, [leccion.id]);

  useEffect(() => {
    setCompletada(completadaInicial);
  }, [leccion.id, completadaInicial]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!mostrarSimulador || typeof document === 'undefined' || !document.body) return;
    const anterior = document.body.style.overflow || '';
    document.body.style.overflow = 'hidden';
    return () => {
      if (document.body) document.body.style.overflow = anterior;
    };
  }, [mostrarSimulador]);

  const iniciarExamen = async () => {
    if (!leccion.simuladorId) return;
    setCargandoSimulador(true);

    try {
      const examen = await cargarExamenLeccion(leccion.id);
      if (!examen.ok) {
        alert(examen.mensaje);
        return;
      }
      setSimuladorData({ sim: examen.sim, pregs: examen.pregs });
      setExamenTerminado(false);
      setMostrarSimulador(true);
    } catch (error) {
      console.error('Error al cargar el examen:', error);
      alert('Hubo un problema al cargar el examen. Por favor, inténtalo de nuevo.');
    } finally {
      setCargandoSimulador(false);
    }
  };

  /**
   * Marca o desmarca la lección al instante y luego confirma en `progreso_lecciones`.
   * Si la base de datos rechaza el cambio, se restaura el estado anterior.
   */
  const toggleProgreso = async () => {
    if (!user) {
      setToast('Debes iniciar sesión para guardar tu progreso.');
      return;
    }
    if (progresoLock.current) return;

    const anterior = completada;
    progresoLock.current = true;
    setIsUpdatingProgress(true);
    setCompletada(!anterior);

    const { error } = anterior
      ? await supabase.from('progreso_lecciones').delete().eq('usuario_id', user.id).eq('leccion_id', leccion.id)
      : await supabase.from('progreso_lecciones').insert({ usuario_id: user.id, leccion_id: leccion.id });

    progresoLock.current = false;
    setIsUpdatingProgress(false);

    // 23505: la fila ya existía; el estado optimista (completada) coincide con la base
    if (error && error.code !== '23505') {
      console.error('Error actualizando progreso:', error.code);
      setCompletada(anterior);
      setToast('No se pudo guardar tu progreso. Inténtalo de nuevo.');
      return;
    }

    router.refresh();
  };

  const embedUrl = getYouTubeEmbedUrl(leccion.videoUrl);
  const materiales = parsearAdjuntos(leccion.adjuntos);
  const apuntesUrl = materiales.find((item) => esApuntePizarra(item))?.url || '';
  const adjuntos = materiales.filter((item) => !esApuntePizarra(item));
  const contenidoTexto = leccion.contenidoHtml || '';

  return (
    <>
      {toast && (
        <div className="fixed bottom-4 inset-x-4 z-[80] rounded-xl bg-rose-600 p-4 text-sm font-semibold text-white shadow-xl sm:left-auto sm:right-4" role="status">
          {toast}
        </div>
      )}

      {mostrarSimulador && simuladorData && (
        <div className="fixed inset-0 z-[100] overflow-y-auto overscroll-contain bg-white" role="dialog" aria-modal="true" aria-label="Examen del módulo">
          <button
            onClick={() => {
              if (!examenTerminado && !window.confirm('¿Estás seguro de salir? Perderás el progreso de este intento.')) return;
              setExamenTerminado(false);
              setMostrarSimulador(false);
            }}
            className="fixed right-4 top-4 z-[60] flex items-center gap-2 rounded-full bg-gray-900 p-3 text-sm font-bold text-white shadow-lg transition-colors hover:bg-rose-600"
          >
            <X size={20} /> Salir del Examen
          </button>
          <div className="pb-10 pt-16">
            <Simulator
              initialSimulator={simuladorData.sim}
              initialQuestions={simuladorData.pregs}
              onFinish={(score) => {
                setExamenTerminado(true);
                if (score >= 70 && !completada) toggleProgreso();
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
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          {embedUrl ? (
            <div key={leccion.id} className="aspect-video w-full overflow-hidden rounded-none bg-black sm:rounded-2xl">
              <iframe
                src={embedUrl}
                title={leccion.titulo}
                loading="lazy"
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : leccion.videoUrl ? (
            <div className="bg-gray-100 p-10 text-center">
              <a href={leccion.videoUrl} target="_blank" rel="noopener noreferrer" className="font-bold text-blue-600 hover:underline">
                Ver Video Externo
              </a>
            </div>
          ) : null}

          {apuntesUrl && (
            <div className="border-b border-blue-100 bg-blue-50 p-6 md:px-8">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-white p-3 text-blue-600 shadow-sm">
                    <PenTool className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-lg font-extrabold text-blue-950">📝 Apuntes de Pizarra</p>
                    <p className="text-sm text-blue-800">La pizarra digital de esta clase.</p>
                  </div>
                </div>
                <a
                  href={apuntesUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-blue-700"
                >
                  Abrir apuntes
                  <ExternalLink className="h-4 w-4" aria-hidden="true" />
                </a>
              </div>
            </div>
          )}

          <div className="flex flex-col justify-between gap-4 border-b border-gray-100 p-6 sm:flex-row sm:items-center md:p-8">
            <div>
              <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-primary">
                {leccion.moduloTitulo} · Clase {leccion.numero}
              </span>
              <h1 className="text-2xl font-extrabold text-gray-900 md:text-3xl">{leccion.titulo}</h1>
            </div>

            <button
              onClick={toggleProgreso}
              disabled={isUpdatingProgress}
              className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold shadow-sm transition-all ${
                completada
                  ? 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100'
                  : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              {isUpdatingProgress ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : completada ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <Circle className="h-5 w-5 text-gray-400" />
              )}
              {completada ? 'Completado' : 'Marcar como completado'}
            </button>
          </div>

          {contenidoTexto && (
            <article className="prose prose-slate mx-auto max-w-3xl px-5 py-6 sm:prose-lg">
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

          {adjuntos.length > 0 && (
            <div className="border-t border-slate-100 bg-slate-50 p-6 md:p-8">
              <h3 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-500">
                <DownloadCloud className="h-5 w-5" /> Material Adicional Descargable
              </h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
                      className="group flex min-h-[56px] items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 transition-all hover:border-primary hover:shadow-md active:scale-[0.98] active:bg-slate-50"
                    >
                      <div className="shrink-0 rounded-lg bg-blue-50 p-2 text-blue-600 transition-colors group-hover:bg-primary group-hover:text-white">
                        <FileText size={20} />
                      </div>
                      <span className="line-clamp-2 min-w-0 flex-1 break-words text-sm font-semibold text-slate-700 transition-colors group-hover:text-primary">
                        {etiqueta}
                      </span>
                      <ExternalLink size={16} className="shrink-0 text-slate-400" />
                    </a>
                  );
                })}
              </div>
            </div>
          )}

          {leccion.simuladorId && (
            <div className="flex flex-col items-center border-t border-emerald-100 bg-emerald-50 p-6 text-center md:p-8">
              <CheckSquare className="mb-3 h-12 w-12 text-emerald-500" />
              <h3 className="mb-2 text-lg font-bold text-emerald-900">Examen del Módulo</h3>
              <p className="mb-5 max-w-md text-sm text-emerald-700">
                Pon a prueba los conocimientos adquiridos en esta lección. Necesitarás aprobar para asegurar tu progreso.
              </p>
              <button
                onClick={iniciarExamen}
                disabled={cargandoSimulador}
                className="flex transform items-center gap-2 rounded-xl bg-emerald-600 px-8 py-3 font-bold text-white shadow-md transition-all hover:-translate-y-1 hover:bg-emerald-700 disabled:bg-emerald-400"
              >
                {cargandoSimulador ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" /> Cargando examen...
                  </>
                ) : (
                  'Rendir Examen Ahora'
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
