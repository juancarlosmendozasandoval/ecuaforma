import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import Breadcrumbs from '../../../components/Breadcrumbs';
import Link from 'next/link';
import { BookOpen, PlayCircle, FileText, Lock, CheckCircle, CheckSquare, Folder } from 'lucide-react';
import BotonInscripcionGratis from '../../../components/BotonInscripcionGratis';
import BotonIniciarSesion from '../../../components/BotonIniciarSesion';
import BotonPayPhone from '../../../components/BotonPayPhone';
import { aplanarLecciones, cargarTemarioCurso, tituloLeccionTemario, type LeccionBancoTemario } from '@/lib/cursos/temario';
import { esCursoDePago, tieneMatricula } from '@/lib/cursos/acceso';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

/** La página de venta solo necesita títulos y tipo: nunca el contenido de la clase. */
const CAMPOS_BANCO_VENTA = 'id, titulo_interno, tipo, simulador_id';

/** Etiqueta e icono de la tarjeta según `banco_lecciones.tipo`. */
function detalleTipo(leccion: LeccionBancoTemario | null) {
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

  const { data: { user } } = await supabase.auth.getUser();
  const tieneAcceso = await tieneMatricula(user?.id, curso.id);
  const esPago = esCursoDePago(curso);

  const modulos = await cargarTemarioCurso(createAdminClient(), curso.id, CAMPOS_BANCO_VENTA);
  const lecciones = aplanarLecciones(modulos);
  const totalLecciones = lecciones.length;
  const primeraLeccion = lecciones[0];
  const aulaHref = primeraLeccion
    ? `/cursos/${params.institucion}/${params.slug}/${primeraLeccion.id}`
    : '';

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
                  {esPago ? (
                    <div className="flex items-end gap-1 text-emerald-600">
                      <span className="text-xl font-bold">$</span>
                      <span className="text-4xl font-black">{curso.precio || 0}</span>
                      <span className="text-sm font-medium mb-1 text-gray-500">USD</span>
                    </div>
                  ) : (
                    <span className="text-3xl font-black text-blue-600">GRATIS</span>
                  )}
                </div>

                {!user ? (
                  <BotonIniciarSesion className="block w-full bg-slate-900 text-white text-center py-3 rounded-xl font-bold shadow-md hover:bg-slate-800 transition-colors">
                    {esPago ? 'Inicia sesión para comprar' : 'Inicia sesión para inscribirte'}
                  </BotonIniciarSesion>
                ) : esPago ? (
                  <BotonPayPhone cursoId={curso.id} precio={Number(curso.precio) || 0} />
                ) : (
                  <BotonInscripcionGratis cursoId={curso.id} />
                )}
              </div>
            )}
            
            {tieneAcceso && (
              <div className="mt-6 space-y-3 border-t border-gray-100 pt-6">
                <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-3 text-sm font-bold text-green-800">
                  <CheckCircle className="h-6 w-6 shrink-0 text-green-600" />
                  ¡Ya tienes acceso a este curso!
                </div>
                {aulaHref ? (
                  <Link
                    href={aulaHref}
                    className="flex w-full items-center justify-center rounded-xl bg-blue-600 py-3.5 text-center text-lg font-bold text-white shadow-md transition-colors hover:bg-blue-700"
                  >
                    Ir al Aula / Continuar Aprendizaje
                  </Link>
                ) : null}
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
                          const titulo = tituloLeccionTemario(item);
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
