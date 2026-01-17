import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { History, Clock, ArrowRight, CheckCircle, XCircle } from 'lucide-react';

export default async function MiHistorialPage() {
  const cookieStore = cookies();
  const supabase = createServerComponentClient({ cookies: () => cookieStore });

  // 1. Verificar sesión
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/');
  }

  // 2. Consulta a la tabla resultados + datos del simulador (JOIN)
  const { data: historial, error } = await supabase
    .from('resultados')
    .select(`
      id,
      puntaje,
      aciertos,
      total_preguntas,
      created_at,
      simuladores (
        nombre,
        slug,
        institucion,
        categoria
      )
    `)
    .eq('usuario_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error al cargar historial:', error);
    return (
      <div className="main-container py-10 text-center">
        <p className="text-red-500">Hubo un problema cargando tus resultados.</p>
      </div>
    );
  }

  return (
    <div className="main-container py-10">
      <div className="flex flex-col md:flex-row md:items-center gap-4 mb-8">
        <div className="p-3 bg-blue-100 rounded-full text-blue-600 w-fit">
          <History size={32} />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Historial de Intentos</h1>
          <p className="text-text-secondary">Tu progreso y calificaciones recientes.</p>
        </div>
      </div>

      {!historial || historial.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
          <p className="text-xl text-text-secondary mb-6">Aún no has completado ningún simulador.</p>
          <Link 
            href="/simuladores" 
            className="inline-flex items-center bg-primary text-white font-bold py-3 px-6 rounded-lg hover:bg-secondary transition-colors"
          >
            Ir a practicar <ArrowRight className="ml-2 w-5 h-5"/>
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {historial.map((item: any) => {
            const fecha = new Date(item.created_at).toLocaleDateString('es-EC', {
              day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
            });
            // Casting seguro por si acaso la relación viene vacía (ej. simulador borrado)
            const simulador = item.simuladores; 
            const aprobado = item.puntaje >= 70;

            return (
              <div key={item.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow flex flex-col md:flex-row justify-between items-center gap-4">
                
                {/* Columna Izquierda: Información */}
                <div className="flex-1 w-full text-left">
                  {simulador ? (
                    <>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold uppercase tracking-wider text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                          {simulador.institucion}
                        </span>
                        <span className="text-xs text-gray-400">•</span>
                        <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                          {simulador.categoria}
                        </span>
                      </div>
                      <h3 className="text-lg md:text-xl font-bold text-gray-800 mb-2">
                        {simulador.nombre}
                      </h3>
                    </>
                  ) : (
                    <h3 className="text-lg text-gray-400 italic mb-2">Simulador no disponible</h3>
                  )}
                  
                  <div className="flex items-center text-sm text-text-secondary">
                    <Clock size={14} className="mr-1" /> {fecha}
                  </div>
                </div>

                {/* Columna Derecha: Puntaje */}
                <div className="flex items-center justify-between w-full md:w-auto gap-6 bg-gray-50 md:bg-transparent p-3 md:p-0 rounded-lg">
                   <div className="text-right">
                      <div className={`text-2xl md:text-3xl font-black flex items-center gap-2 justify-end ${aprobado ? 'text-green-600' : 'text-red-500'}`}>
                        {aprobado ? <CheckCircle size={20}/> : <XCircle size={20}/>}
                        {item.puntaje}/100
                      </div>
                      <div className="text-xs text-gray-500 font-medium">
                        {item.aciertos} de {item.total_preguntas} aciertos
                      </div>
                   </div>
                   
                   {simulador?.slug && (
                     <Link 
                        href={`/simulador/${simulador.slug}`}
                        className="p-3 text-gray-400 hover:text-primary hover:bg-blue-50 rounded-full transition-all"
                        title="Repetir este simulador"
                      >
                        <ArrowRight size={24} />
                     </Link>
                   )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}