import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import Link from 'next/link';
import Card from '../components/Card';
import { Lock, GraduationCap, ArrowRight, Settings, Award, BookOpen } from 'lucide-react';
import CertificateGenerator from '../components/CertificateGenerator';

export const dynamic = 'force-dynamic';

export default async function MisCursosPage(props: any) {
  const cookieStore = cookies();
  const supabase = createServerComponentClient({ cookies: () => cookieStore });
  
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="text-center mt-10 p-8 main-container">
        <h1 className="text-2xl font-bold">Inicia Sesión</h1>
        <p className="mt-2 text-gray-600">Por favor, inicia sesión para ver tu contenido privado.</p>
      </div>
    );
  }

  // =========================================================================
  // 🌟 LÓGICA DE VALIDACIÓN Y MATRICULACIÓN AUTOMÁTICA
  // =========================================================================
  const searchParams = await props.searchParams;
  const paymentId = searchParams?.id;
  const clientTxId = searchParams?.clientTransactionId;
  const cursoComprado = searchParams?.curso;
  let mensajeAlerta = null;

  if (paymentId && clientTxId && cursoComprado) {
    try {
      console.log(`[PAGO DETECTADO] ID: ${paymentId}, Curso: ${cursoComprado}`);
      
      // 🌟 SOLUCIÓN: Buscamos todos los cursos y los limpiamos de tildes para asegurar la coincidencia
      const { data: listaCursos } = await supabase.from('cursos').select('id, nombre');
      
      const cursoNormalizado = cursoComprado.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
      
      const cursoEncontrado = listaCursos?.find(c => 
        c.nombre.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim() === cursoNormalizado
      );

      if (cursoEncontrado) {
        console.log(`[CURSO IDENTIFICADO EN BD] ID: ${cursoEncontrado.id}`);
        
        const { data: yaInscrito } = await supabase
          .from('accesos_cursos')
          .select('id')
          .eq('usuario_id', user.id)
          .eq('curso_id', cursoEncontrado.id)
          .single();

        if (!yaInscrito) {
          const { error: errorInscripcion } = await supabase
            .from('accesos_cursos')
            .insert({ usuario_id: user.id, curso_id: cursoEncontrado.id });

          if (!errorInscripcion) {
            mensajeAlerta = { tipo: 'success', texto: `¡Pago exitoso! Se ha habilitado tu acceso al curso de ${cursoComprado}.` };
          } else {
            console.error("[ERROR INSCRIPCIÓN]", errorInscripcion);
            mensajeAlerta = { tipo: 'error', texto: 'Tu pago fue aprobado, pero hubo un error al activar el curso. Por favor contáctanos por WhatsApp.' };
          }
        } else {
          mensajeAlerta = { tipo: 'success', texto: `El pago se procesó correctamente, ya tenías acceso a ${cursoComprado}.` };
        }
      } else {
         console.error(`[ERROR BD] No se encontró el curso en Supabase parecido a: ${cursoComprado}`);
         mensajeAlerta = { tipo: 'error', texto: `Pago aprobado, pero no logramos identificar el curso exacto (${cursoComprado}). Contáctanos para habilitarlo manualmente.` };
      }
    } catch (err) {
       console.error("Error grave en la matriculación:", err);
       mensajeAlerta = { tipo: 'error', texto: 'Tuvimos un problema procesando tu curso. Si el dinero fue descontado, contáctanos.' };
    }
  } else if (searchParams?.id && !clientTxId) {
    mensajeAlerta = { tipo: 'error', texto: 'La transacción fue cancelada o no se completó correctamente.' };
  }
  // =========================================================================

  // PARTE A: Consultar los Simuladores Privados
  const { data: accesosSims } = await supabase
    .from('accesos_simuladores')
    .select('simulador_id')
    .eq('usuario_id', user.id);

  const simuladorIds = accesosSims ? accesosSims.map(a => a.simulador_id) : [];

  let simuladoresPrivados: any[] = [];
  if (simuladorIds.length > 0) {
    const { data: simsData } = await supabase
      .from('simuladores')
      .select('*')
      .in('id', simuladorIds);
    if (simsData) simuladoresPrivados = simsData;
  }

  // PARTE B: Consultar los Cursos Multimedia
  const { data: accesosCursos } = await supabase
    .from('accesos_cursos')
    .select(`
      curso_id,
      cursos (
        id,
        nombre,
        slug,
        institucion,
        descripcion
      )
    `)
    .eq('usuario_id', user.id);

  const { data: todasLasLecciones } = await supabase.from('lecciones').select('id, curso_id');
  const { data: progresoUsuario } = await supabase.from('progreso_lecciones').select('leccion_id').eq('usuario_id', user.id);
  
  const leccionesCompletadasIds = progresoUsuario ? progresoUsuario.map(p => p.leccion_id) : [];

  const cursosMultimedia = accesosCursos
    ? accesosCursos.map((acceso: any) => {
        const c = acceso.cursos;
        if (!c) return null;

        const leccionesEsteCurso = todasLasLecciones ? todasLasLecciones.filter(l => l.curso_id === c.id) : [];
        const totalLecciones = leccionesEsteCurso.length;
        
        const completadasEsteCurso = leccionesEsteCurso.filter(l => leccionesCompletadasIds.includes(l.id)).length;
        const porcentaje = totalLecciones > 0 ? Math.round((completadasEsteCurso / totalLecciones) * 100) : 0;

        return {
          ...c,
          totalLecciones,
          completadasEsteCurso,
          porcentaje
        };
      }).filter(Boolean)
    : [];

  const estaVacio = simuladoresPrivados.length === 0 && cursosMultimedia.length === 0;

  if (estaVacio) {
    return (
       <div className="text-center mt-10 p-8 main-container max-w-xl mx-auto space-y-4">
        {mensajeAlerta && (
          <div className={`p-4 rounded-xl font-medium border text-sm ${mensajeAlerta.tipo === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
            {mensajeAlerta.texto}
          </div>
        )}
        <BookOpen className="mx-auto w-12 h-12 text-gray-300" />
        <h1 className="text-2xl font-bold text-gray-800">No tienes material privado asignado</h1>
        <p className="text-gray-600">Aún no se te ha matriculado en ningún curso multimedia ni simulador exclusivo.</p>
      </div>
    );
  }

  return (
    <div className="main-container py-10 min-h-screen bg-gray-50/50">
      
      {mensajeAlerta && (
        <div className={`p-4 mb-6 rounded-xl font-medium border shadow-sm ${mensajeAlerta.tipo === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
          {mensajeAlerta.texto}
        </div>
      )}

      <div className="flex items-center gap-4 mb-2">
        <Lock className="w-8 h-8 text-primary"/>
        <h1 className="text-3xl font-bold">Mi Aula Virtual</h1>
      </div>
      <p className="mb-10 text-text-secondary">Gestiona tu ritmo de estudio y accede al contenido exclusivo asignado a tu cuenta.</p>

      {cursosMultimedia.length > 0 && (
        <div className="mb-12">
          <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2 border-b border-gray-200 pb-2">
            <GraduationCap className="text-primary w-5 h-5"/> Programas de Estudio Completos
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {cursosMultimedia.map((curso: any) => (
              <div key={curso.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col group hover:shadow-md transition-all">
                <div className="p-6 flex-1 flex flex-col">
                  <span className="text-[10px] font-bold uppercase bg-blue-50 text-blue-600 px-2.5 py-1 rounded-md border border-blue-100 w-fit mb-3">
                    {curso.institucion}
                  </span>
                  <h3 className="text-lg font-bold text-gray-800 mb-2">{curso.nombre}</h3>
                  <p className="text-xs text-gray-400 line-clamp-2 mb-6 flex-1">{curso.descripcion}</p>

                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-semibold text-gray-500">
                      <span>Progreso</span>
                      <span className="text-primary font-bold">{curso.porcentaje}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                      <div className="bg-primary h-2 rounded-full transition-all duration-500" style={{ width: `${curso.porcentaje}%` }}></div>
                    </div>
                    <div className="flex justify-between text-[11px] text-gray-400 pt-0.5">
                      <span>{curso.completadasEsteCurso} de {curso.totalLecciones} clases</span>
                      {curso.porcentaje === 100 && (
                        <span className="text-emerald-600 font-bold flex items-center gap-0.5"><Award size={12}/> Completado</span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="p-4 bg-gray-50 border-t border-gray-50 flex items-center justify-between">
                  <div>
                    {curso.porcentaje === 100 && (
                      <CertificateGenerator 
                        nombrePorDefecto={
                          user.user_metadata?.full_name || 
                          user.user_metadata?.name || 
                          (user.email ? user.email.split('@')[0].replace(/[^a-zA-Z0-9]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Estudiante')
                        } 
                        nombreCurso={curso.nombre} 
                        institucion={curso.institucion} 
                      />
                    )}
                  </div>
                  
                  <Link 
                    href={`/cursos/${curso.institucion.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")}/${curso.slug}`}
                    className="text-sm font-bold text-primary flex items-center gap-1 group-hover:text-blue-700 transition-colors"
                  >
                    Entrar al Aula <ArrowRight size={16} className="transform group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {simuladoresPrivados.length > 0 && (
        <div>
          <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2 border-b border-gray-200 pb-2">
            <Settings className="text-primary w-5 h-5"/> Bancos de Preguntas y Simuladores
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {simuladoresPrivados.map(sim => (
              <Card 
                key={sim.slug} 
                title={sim.nombre} 
                href={`/simulador/${sim.slug}`} 
                description={`${sim.institucion} - ${sim.categoria}`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}