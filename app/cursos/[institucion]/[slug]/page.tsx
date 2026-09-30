import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import Breadcrumbs from '../../../components/Breadcrumbs';
import Link from 'next/link';
import { BookOpen, PlayCircle, FileText, Lock, CheckCircle, CreditCard, CheckSquare, Folder } from 'lucide-react';
import BotonInscripcionGratis from '../../../components/BotonInscripcionGratis';
import BotonIniciarSesion from '../../../components/BotonIniciarSesion';
import type { Tables } from '@/types/supabase';

type LeccionBanco = Pick<Tables<'banco_lecciones'>, 'id' | 'titulo_interno' | 'tipo' | 'video_url' | 'simulador_id'>;

/** Fila de `contenido_modulos` con su lección del banco (relación N:1, llega como objeto). */
type ContenidoConLeccion = Pick<Tables<'contenido_modulos'>, 'id' | 'modulo_id' | 'orden' | 'titulo_mostrar' | 'is_preview'> & {
  banco_lecciones: LeccionBanco | null;
};

type ModuloConLecciones = Pick<Tables<'modulos_curso'>, 'id' | 'titulo' | 'orden'> & {
  lecciones: ContenidoConLeccion[];
};

/** Etiqueta e icono de la tarjeta según `banco_lecciones.tipo`. */
function detalleTipo(leccion: LeccionBanco | null) {
  const tipo = (leccion?.tipo || '').toLowerCase();
  if (tipo === 'video' || (!tipo && leccion?.video_url)) return { icon: PlayCircle, label: 'Video clase' };
  if (tipo === 'simulador') return { icon: CheckSquare, label: 'Simulador' };
  return { icon: FileText, label: 'Material teórico' };
}

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

  // 2. Verificar Sesión y Acceso
  const { data: { session } } = await supabase.auth.getSession();
  let tieneAcceso = false;

  if (session) {
    const { data: acceso } = await supabase
      .from('accesos_cursos')
      .select('id')
      .eq('usuario_id', session.user.id)
      .eq('curso_id', curso.id)
      .single();
    
    if (acceso) tieneAcceso = true;
  }

  // 3. Obtener las carpetas del curso
  const { data: modulosData } = await supabase
    .from('modulos_curso')
    .select('id, titulo, orden')
    .eq('curso_id', curso.id)
    .order('orden', { ascending: true });

  const modulosBase = (modulosData || []) as Pick<Tables<'modulos_curso'>, 'id' | 'titulo' | 'orden'>[];

  // 4. Obtener el contenido de esas carpetas con su lección del banco
  let contenido: ContenidoConLeccion[] = [];
  if (modulosBase.length > 0) {
    const { data: contenidoData } = await supabase
      .from('contenido_modulos')
      .select('id, modulo_id, orden, titulo_mostrar, is_preview, banco_lecciones ( id, titulo_interno, tipo, video_url, simulador_id )')
      .in('modulo_id', modulosBase.map((m) => m.id))
      .order('orden', { ascending: true });

    // Se descartan filas cuya lección ya no existe en el banco
    contenido = ((contenidoData || []) as unknown as ContenidoConLeccion[]).filter((c) => c.banco_lecciones);
  }

  const modulos: ModuloConLecciones[] = modulosBase.map((modulo) => ({
    ...modulo,
    lecciones: contenido.filter((c) => c.modulo_id === modulo.id),
  }));

  const totalLecciones = contenido.length;

  const breadcrumbs = [
    { label: 'Inicio', href: '/' },
    { label: `Cursos ${curso.institucion || ''}`, href: `/cursos/${params.institucion}` },
    { label: curso.nombre || '', href: `/cursos/${params.institucion}/${params.slug}`, isActive: true }
  ];

  // Numeración continua de las clases a lo largo de todas las carpetas
  let numeroClase = 0;

  return (
    <div className="main-container py-10 min-h-screen bg-gray-50/50">
      <Breadcrumbs items={breadcrumbs} />
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-6">
        
        {/* Columna Izquierda: Información del Curso */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <h1 className="text-2xl font-black text-gray-800 leading-tight">{curso.nombre || ''}</h1>
            <p className="text-sm text-gray-500 mt-3 leading-relaxed">{curso.descripcion || ''}</p>
            
            <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400 font-medium">
              <span>Estructura del Programa</span>
              <span className="font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded-md">
                {modulos.length} Módulos · {totalLecciones} Lecciones
              </span>
            </div>

            {/* 🌟 CAJA DE COMPRA / MATRÍCULA */}
            {!tieneAcceso && (
              <div className="mt-6 pt-6 border-t border-dashed border-gray-200">
                <div className="mb-4">
                  <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Inversión</span>
                  {curso.es_pago ? (
                    <div className="flex items-end gap-1 text-emerald-600">
                      <span className="text-xl font-bold">$</span>
                      <span className="text-4xl font-black">{curso.precio || 0}</span>
                      <span className="text-sm font-medium mb-1 text-gray-500">USD</span>
                    </div>
                  ) : (
                    <span className="text-3xl font-black text-blue-600">GRATIS</span>
                  )}
                </div>

                {!session ? (
                  <BotonIniciarSesion className="block w-full bg-slate-900 text-white text-center py-3 rounded-xl font-bold shadow-md hover:bg-slate-800 transition-colors">
                    Inicia Sesión para Acceder
                  </BotonIniciarSesion>
                ) : curso.es_pago ? (
                  <div className="space-y-3">
                    <Link 
                      href={`/checkout?curso=${curso.id}`}
                      className="w-full bg-[#f37021] text-white py-3.5 rounded-xl font-bold shadow-md hover:bg-[#d9611b] transition-colors flex items-center justify-center gap-2 text-lg"
                    >
                      <CreditCard className="w-6 h-6"/> Inscribirse y Pagar
                    </Link>
                  </div>
                ) : (
                  <BotonInscripcionGratis cursoId={curso.id} />
                )}
              </div>
            )}
            
            {tieneAcceso && (
              <div className="mt-6 pt-6 border-t border-gray-100">
                <div className="bg-green-50 border border-green-200 text-green-800 p-3 rounded-xl flex items-center gap-3 text-sm font-bold">
                  <CheckCircle className="w-6 h-6 text-green-600 shrink-0"/>
                  ¡Ya tienes acceso a este curso! Selecciona una clase para comenzar.
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Columna Derecha: Temario */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white p-6 md:p-8 rounded-2xl border border-gray-100 shadow-sm">
            <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
              <BookOpen className="text-primary w-6 h-6"/> Plan de Estudios
            </h2>

            {totalLecciones === 0 ? (
              <p className="text-gray-400 italic text-sm text-center py-10 bg-gray-50 rounded-xl border border-dashed border-gray-200">Estamos subiendo las clases de esta materia. ¡Vuelve pronto!</p>
            ) : (
              <div className="space-y-6">
                {modulos.map((modulo, idxModulo) => (
                  <section key={modulo.id} className="rounded-2xl border border-gray-100 overflow-hidden">
                    {/* Encabezado de la carpeta */}
                    <div className="flex items-center justify-between gap-3 px-4 py-3 bg-indigo-50/70 border-b border-indigo-100">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-9 h-9 rounded-xl bg-white text-indigo-500 border border-indigo-100 flex items-center justify-center shrink-0">
                          <Folder className="w-4 h-4"/>
                        </span>
                        <div className="min-w-0">
                          <span className="block text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Módulo {idxModulo + 1}</span>
                          <h3 className="text-sm font-bold text-indigo-900 truncate">{modulo.titulo || 'Módulo sin título'}</h3>
                        </div>
                      </div>
                      <span className="text-[11px] font-bold text-indigo-600 bg-white border border-indigo-100 px-2 py-1 rounded-md shrink-0">
                        {modulo.lecciones.length} {modulo.lecciones.length === 1 ? 'clase' : 'clases'}
                      </span>
                    </div>

                    {/* Lecciones de la carpeta */}
                    <div className="p-3 space-y-3">
                      {modulo.lecciones.length === 0 ? (
                        <p className="text-xs text-gray-400 italic text-center py-4">Contenido en preparación.</p>
                      ) : (
                        modulo.lecciones.map((item) => {
                          numeroClase += 1;
                          const leccion = item.banco_lecciones;
                          const titulo = item.titulo_mostrar || leccion?.titulo_interno || 'Clase sin título';
                          const { icon: IconoTipo, label: etiquetaTipo } = detalleTipo(leccion);
                          const esExamen = (leccion?.tipo || '').toLowerCase() === 'simulador' || !!leccion?.simulador_id;

                          return tieneAcceso ? (
                            <Link 
                              key={item.id}
                              href={`/cursos/${params.institucion}/${params.slug}/${item.id}`}
                              className="flex items-center justify-between p-4 bg-gray-50 hover:bg-blue-50/50 rounded-xl transition-all duration-200 group border border-transparent hover:border-blue-200 hover:shadow-sm"
                            >
                              <div className="flex items-center gap-4">
                                <span className="w-8 h-8 bg-white rounded-lg flex items-center justify-center font-bold text-sm text-gray-400 shadow-sm border border-gray-200 group-hover:bg-primary group-hover:text-white transition-colors">
                                  {numeroClase}
                                </span>
                                <div>
                                  <h4 className="text-sm font-bold text-gray-700 group-hover:text-primary transition-colors">{titulo}</h4>
                                  <span className="text-[11px] text-gray-400 flex items-center gap-1 mt-0.5">
                                    <IconoTipo size={12}/> {etiquetaTipo}
                                  </span>
                                </div>
                              </div>
                              {esExamen && <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-1 rounded font-bold uppercase">Examen</span>}
                            </Link>
                          ) : (
                            <div key={item.id} className="flex items-center justify-between p-4 bg-gray-50/50 rounded-xl border border-gray-100 opacity-80 cursor-not-allowed">
                              <div className="flex items-center gap-4">
                                <span className="w-8 h-8 bg-gray-200 rounded-lg flex items-center justify-center font-bold text-sm text-gray-500">
                                  <Lock size={14}/>
                                </span>
                                <div>
                                  <h4 className="text-sm font-bold text-gray-600">{titulo}</h4>
                                  <span className="text-[11px] text-gray-400 mt-0.5 block">Contenido bloqueado</span>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
