import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import Breadcrumbs from '../../../components/Breadcrumbs';
import Link from 'next/link';
import { BookOpen, PlayCircle, FileText, Lock, CheckCircle, CreditCard } from 'lucide-react';
import BotonInscripcionGratis from '../../../components/BotonInscripcionGratis';

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

  // 3. Obtener las lecciones
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
            <h1 className="text-2xl font-black text-gray-800 leading-tight">{curso.nombre}</h1>
            <p className="text-sm text-gray-500 mt-3 leading-relaxed">{curso.descripcion}</p>
            
            <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400 font-medium">
              <span>Estructura del Programa</span>
              <span className="font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded-md">{lecciones?.length || 0} Lecciones</span>
            </div>

            {/* 🌟 CAJA DE COMPRA / MATRÍCULA */}
            {!tieneAcceso && (
              <div className="mt-6 pt-6 border-t border-dashed border-gray-200">
                <div className="mb-4">
                  <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Inversión</span>
                  {curso.es_pago ? (
                    <div className="flex items-end gap-1 text-emerald-600">
                      <span className="text-xl font-bold">$</span>
                      <span className="text-4xl font-black">{curso.precio}</span>
                      <span className="text-sm font-medium mb-1 text-gray-500">USD</span>
                    </div>
                  ) : (
                    <span className="text-3xl font-black text-blue-600">GRATIS</span>
                  )}
                </div>

                {!session ? (
                  <Link href="/auth" className="block w-full bg-slate-900 text-white text-center py-3 rounded-xl font-bold shadow-md hover:bg-slate-800 transition-colors">
                    Inicia Sesión para Acceder
                  </Link>
                ) : curso.es_pago ? (
                  <div className="space-y-3">
                    <Link 
                      href={`/checkout?nombre=${encodeURIComponent(curso.nombre)}&precio=${curso.precio}`}
                      className="w-full bg-[#f37021] text-white py-3.5 rounded-xl font-bold shadow-md hover:bg-[#d9611b] transition-colors flex items-center justify-center gap-2 text-lg"
                    >
                      <CreditCard className="w-6 h-6"/> Inscribirse y Pagar
                    </Link>
                  </div>
                ) : (
                  <BotonInscripcionGratis cursoId={curso.id} usuarioId={session.user.id} />
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

            {!lecciones || lecciones.length === 0 ? (
              <p className="text-gray-400 italic text-sm text-center py-10 bg-gray-50 rounded-xl border border-dashed border-gray-200">Estamos subiendo las clases de esta materia. ¡Vuelve pronto!</p>
            ) : (
              <div className="space-y-3">
                {lecciones.map((lec, idx) => {
                  const mostrarHeaderSeccion = idx === 0 || lecciones[idx - 1].seccion !== lec.seccion;

                  return (
                    <div key={lec.id}>
                      {mostrarHeaderSeccion && (
                        <h3 className="text-xs font-bold text-indigo-500 uppercase tracking-widest mt-6 mb-3 px-2">
                          {lec.seccion || 'Módulo Principal'}
                        </h3>
                      )}
                      
                      {tieneAcceso ? (
                        <Link 
                          href={`/cursos/${params.institucion}/${params.slug}/${lec.id}`}
                          className="flex items-center justify-between p-4 bg-gray-50 hover:bg-blue-50/50 rounded-xl transition-all duration-200 group border border-transparent hover:border-blue-200 hover:shadow-sm"
                        >
                          <div className="flex items-center gap-4">
                            <span className="w-8 h-8 bg-white rounded-lg flex items-center justify-center font-bold text-sm text-gray-400 shadow-sm border border-gray-200 group-hover:bg-primary group-hover:text-white transition-colors">
                              {idx + 1}
                            </span>
                            <div>
                              <h4 className="text-sm font-bold text-gray-700 group-hover:text-primary transition-colors">{lec.titulo}</h4>
                              <span className="text-[11px] text-gray-400 flex items-center gap-1 mt-0.5">
                                {lec.video_url ? <><PlayCircle size={12}/> Video clase</> : <><FileText size={12}/> Material teórico</>}
                              </span>
                            </div>
                          </div>
                          {lec.simulador_id && <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-1 rounded font-bold uppercase">Examen</span>}
                        </Link>
                      ) : (
                        <div className="flex items-center justify-between p-4 bg-gray-50/50 rounded-xl border border-gray-100 opacity-80 cursor-not-allowed">
                          <div className="flex items-center gap-4">
                            <span className="w-8 h-8 bg-gray-200 rounded-lg flex items-center justify-center font-bold text-sm text-gray-500">
                              <Lock size={14}/>
                            </span>
                            <div>
                              <h4 className="text-sm font-bold text-gray-600">{lec.titulo}</h4>
                              <span className="text-[11px] text-gray-400 mt-0.5 block">Contenido bloqueado</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}