import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { confirmarPago } from '@/lib/pagos/confirmarPago';
import { aplanarLecciones, cargarTemarioCurso, tituloLeccionTemario } from '@/lib/cursos/temario';
import Link from 'next/link';
import Card from '../components/Card';
import { Lock, GraduationCap, ArrowRight, Settings, Award, BookOpen } from 'lucide-react';
import CertificateGenerator from '../components/CertificateGenerator';

export const dynamic = 'force-dynamic';

const MENSAJE_CERTIFICADO = 'Completa el 100% del curso para desbloquear tu certificado';

function formatearFechaCertificado(iso: string) {
  const fecha = iso ? new Date(iso) : new Date();
  const valida = Number.isNaN(fecha.getTime()) ? new Date() : fecha;
  return valida.toLocaleDateString('es-EC', {
    timeZone: 'America/Guayaquil',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function nombreDesdeSesion(metadata: Record<string, unknown> | null | undefined) {
  const meta = metadata || {};
  const completo = typeof meta.full_name === 'string' ? meta.full_name.trim() : '';
  const corto = typeof meta.name === 'string' ? meta.name.trim() : '';
  return completo || corto || 'Estudiante';
}

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
  // 🌟 RETORNO DE PAYPHONE: solo se usan id + clientTransactionId.
  // El curso y el usuario salen del registro en `pagos` (nunca de la URL).
  // =========================================================================
  const searchParams = await props.searchParams;
  const paymentId = searchParams?.id;
  const clientTxId = searchParams?.clientTransactionId;
  let mensajeAlerta: { tipo: 'success' | 'error'; texto: string } | null = null;

  if (paymentId && clientTxId) {
    const resultado = await confirmarPago(Number(paymentId), String(clientTxId));
    const esMio = !!resultado.pago && resultado.pago.usuario_id === user.id;

    if (resultado.ok && esMio) {
      const { data: cursoPagado } = await supabase
        .from('cursos')
        .select('nombre')
        .eq('id', resultado.pago.curso_id)
        .maybeSingle();
      const nombreCurso = cursoPagado?.nombre || 'tu curso';
      mensajeAlerta = resultado.yaProcesado
        ? { tipo: 'success', texto: `El pago ya estaba verificado. Tienes acceso a ${nombreCurso}.` }
        : { tipo: 'success', texto: `¡Pago exitoso! Se ha habilitado tu acceso a ${nombreCurso}.` };
    } else if (!resultado.ok && esMio && resultado.motivo === 'no_aprobado') {
      mensajeAlerta = { tipo: 'error', texto: 'Tu tarjeta fue declinada o el pago no se completó. No se realizó ningún cobro. Puedes intentarlo de nuevo o contactarnos por WhatsApp.' };
    } else if (!resultado.ok && esMio && resultado.motivo === 'error_matricula') {
      mensajeAlerta = { tipo: 'error', texto: 'Tu pago fue aprobado, pero hubo un error al activar el curso. Por favor contáctanos por WhatsApp.' };
    } else {
      mensajeAlerta = { tipo: 'error', texto: 'No pudimos verificar este pago en este momento. Si se realizó un cobro, contáctanos por WhatsApp con tu comprobante.' };
    }
  } else if (paymentId && !clientTxId) {
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

  const nombreAlumno = nombreDesdeSesion(user.user_metadata as Record<string, unknown> | null);

  // progreso_lecciones.leccion_id guarda el ID de contenido_modulos
  const { data: progresoUsuario } = await supabase
    .from('progreso_lecciones')
    .select('leccion_id, completado_en')
    .eq('usuario_id', user.id);
  const leccionesCompletadasIds = new Set((progresoUsuario || []).map((p) => p.leccion_id));
  const fechaPorLeccion = new Map(
    (progresoUsuario || []).map((p) => [p.leccion_id, p.completado_en || ''])
  );

  const cursosMultimedia = (
    await Promise.all(
      (accesosCursos || []).map(async (acceso: any) => {
        const curso = Array.isArray(acceso.cursos) ? acceso.cursos[0] : acceso.cursos;
        if (!curso?.id) return null;

        // Mismo orden que el aula: módulo y, dentro, orden de la lección.
        const lecciones = aplanarLecciones(await cargarTemarioCurso(supabase, curso.id));
        const totalLecciones = lecciones.length;
        const completadasEsteCurso = lecciones.filter((leccion) => leccionesCompletadasIds.has(leccion.id)).length;
        const porcentaje = totalLecciones > 0 ? Math.round((completadasEsteCurso / totalLecciones) * 100) : 0;
        const ultimaCompletada = lecciones
          .map((leccion) => fechaPorLeccion.get(leccion.id) || '')
          .filter(Boolean)
          .sort()
          .at(-1) || '';
        const pendiente = lecciones.find((leccion) => !leccionesCompletadasIds.has(leccion.id)) || null;
        const primera = lecciones[0] || null;
        const destino = porcentaje === 100 ? primera : pendiente || primera;

        const institucionRuta = (curso.institucion || '')
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '');
        const rutaCurso = `/cursos/${institucionRuta}/${curso.slug || ''}`;

        return {
          ...curso,
          totalLecciones,
          completadasEsteCurso,
          porcentaje,
          continuarHref: destino ? `${rutaCurso}/${destino.id}` : rutaCurso,
          tituloDestino: destino ? tituloLeccionTemario(destino) : '',
          fechaCompletado: porcentaje === 100 ? formatearFechaCertificado(ultimaCompletada) : '',
        };
      })
    )
  ).filter(Boolean);

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
              <div key={curso.id} className="flex flex-col overflow-visible rounded-2xl border border-gray-100 bg-white shadow-sm transition-all hover:shadow-md">
                <div className="p-6 flex-1 flex flex-col">
                  <span className="text-[10px] font-bold uppercase bg-blue-50 text-blue-600 px-2.5 py-1 rounded-md border border-blue-100 w-fit mb-3">
                    {curso.institucion || ''}
                  </span>
                  <h3 className="text-lg font-bold text-gray-800 mb-2">{curso.nombre || ''}</h3>
                  <p className="text-xs text-gray-400 line-clamp-2 mb-6 flex-1">{curso.descripcion || ''}</p>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3 text-sm font-bold">
                      <span className={curso.porcentaje === 100 ? 'text-emerald-600' : 'text-blue-700'}>
                        {curso.porcentaje}% completado
                      </span>
                      <span className="text-xs font-semibold text-gray-400">
                        {curso.completadasEsteCurso} de {curso.totalLecciones} clases
                      </span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-200">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${curso.porcentaje === 100 ? 'bg-emerald-500' : 'bg-blue-600'}`}
                        style={{ width: `${curso.porcentaje}%` }}
                      />
                    </div>
                    {curso.porcentaje === 100 ? (
                      <span className="flex items-center gap-1 text-xs font-bold text-emerald-600">
                        <Award size={12} /> Completado
                      </span>
                    ) : curso.tituloDestino ? (
                      <p className="truncate text-xs text-gray-500">Siguiente: {curso.tituloDestino}</p>
                    ) : null}
                  </div>
                </div>
                
                <div className="space-y-3 rounded-b-2xl border-t border-gray-100 bg-gray-50 p-4">
                  {curso.porcentaje === 100 ? (
                    <CertificateGenerator
                      nombreAlumno={nombreAlumno}
                      nombreCurso={curso.nombre || ''}
                      institucion={curso.institucion || ''}
                      fechaCompletado={curso.fechaCompletado}
                    />
                  ) : (
                    <div className="group relative" title={MENSAJE_CERTIFICADO}>
                      <button
                        type="button"
                        disabled
                        aria-label={MENSAJE_CERTIFICADO}
                        className="pointer-events-none flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-gray-200 px-4 py-2.5 text-sm font-bold text-gray-500"
                      >
                        <Lock size={16} /> Descargar Certificado
                      </button>
                      <span
                        role="tooltip"
                        className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 hidden w-64 -translate-x-1/2 rounded-lg bg-slate-900 px-3 py-2 text-center text-xs font-semibold leading-snug text-white shadow-lg group-hover:block"
                      >
                        {MENSAJE_CERTIFICADO}
                      </span>
                    </div>
                  )}
                  
                  <Link 
                    href={curso.continuarHref}
                    className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-white shadow-sm transition-colors ${
                      curso.porcentaje === 100 ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                  >
                    {curso.porcentaje === 100 ? 'Repasar curso' : 'Continuar aprendizaje'}
                    <ArrowRight size={16} />
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