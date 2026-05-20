'use client';

import { useEffect, useState } from 'react';
import { useSupabase } from '../../../components/AuthProvider';
import { ArrowLeft, Users, TrendingUp, AlertTriangle, RefreshCw, Trophy, Trash2, Download } from 'lucide-react';
import Link from 'next/link';

export default function ResultadosPage({ params }: { params: { slug: string } }) {
  const { supabase } = useSupabase();
  const [loading, setLoading] = useState(true);
  const [simulador, setSimulador] = useState<any>(null);
  const [resultados, setResultados] = useState<any[]>([]);
  const [preguntas, setPreguntas] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({ promedio: 0, total: 0, mejor: 0 });
  const [analisisPreguntas, setAnalisisPreguntas] = useState<any[]>([]);

  // 1. Cargar Datos
  const cargarDatos = async () => {
    setLoading(true);
    try {
      const { data: sim } = await supabase.from('simuladores').select('*').eq('slug', params.slug).single();
      if (!sim) return;
      setSimulador(sim);

      const { data: pregs } = await supabase
        .from('preguntas')
        .select('*')
        .eq('simulador_id', sim.id)
        .order('orden', { ascending: true })
        .order('id', { ascending: true });
      setPreguntas(pregs || []);

      const { data: res } = await supabase
        .from('resultados')
        .select('*')
        .eq('simulador_id', sim.id)
        .order('created_at', { ascending: false }); 
      setResultados(res || []);

      if (res && res.length > 0) {
        const suma = res.reduce((acc: number, curr: any) => acc + curr.puntaje, 0);
        const mejor = Math.max(...res.map((r: any) => r.puntaje));
        setStats({
          promedio: (suma / res.length).toFixed(1),
          total: res.length,
          mejor: mejor
        });

        if (pregs) {
          const analisis = pregs.map((preg, index) => {
            let fallos = 0;
            let aciertos = 0;

            res.forEach((intento: any) => {
              const respuestasUsuario = intento.detalle_respuestas; 
              if (!respuestasUsuario) return;
              
              const respuestaDada = respuestasUsuario[index.toString()] || respuestasUsuario[index];
              
              if (respuestaDada && respuestaDada.value === preg.respuesta.value) {
                aciertos++;
              } else {
                fallos++;
              }
            });

            return {
              id: preg.id,
              texto: preg.pregunta,
              totalIntentos: aciertos + fallos,
              aciertos,
              fallos,
              tasaFallo: (aciertos + fallos) > 0 ? (fallos / (aciertos + fallos)) * 100 : 0
            };
          });
          
          setAnalisisPreguntas(analisis.sort((a, b) => b.tasaFallo - a.tasaFallo));
        }
      } else {
        setStats({ promedio: 0, total: 0, mejor: 0 });
        setAnalisisPreguntas([]);
      }

    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // --- FUNCIÓN: BORRAR TODO ---
  const handleResetSimulator = async () => {
    if (!simulador) return;
    
    const confirmacion = window.confirm(
      `⚠️ ¿ESTÁS SEGURO?\n\nEsto borrará PERMANENTEMENTE los ${resultados.length} intentos registrados de "${simulador.nombre}".\n\nÚsalo solo antes de iniciar un nuevo curso.`
    );

    if (confirmacion) {
      const { error } = await supabase
        .from('resultados')
        .delete()
        .eq('simulador_id', simulador.id);

      if (error) {
        alert('Error al borrar: ' + error.message);
      } else {
        alert('✅ Historial reseteado correctamente. Listo para la nueva clase.');
        cargarDatos(); 
      }
    }
  };

  // --- NUEVA FUNCIÓN: EXPORTAR A EXCEL (CSV) ---
  const exportarCSV = () => {
    if (resultados.length === 0) return alert("No hay resultados para exportar.");
    
    let csvContent = "Estudiante,Nota,Fecha,Hora\n";
    
    resultados.forEach(res => {
      const email = res.email ? res.email.split('@')[0] : 'Anonimo';
      const fecha = new Date(res.created_at);
      const fechaFormat = fecha.toLocaleDateString('es-EC');
      const horaFormat = fecha.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Guayaquil' });
      
      csvContent += `${email},${res.puntaje},${fechaFormat},${horaFormat}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Notas_${simulador.nombre.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    cargarDatos();
  }, [params.slug]);

  if (loading) return <div className="p-10 text-center animate-pulse">Analizando datos de la clase...</div>;
  if (!simulador) return <div className="p-10 text-center">Simulador no encontrado</div>;

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20 p-4">
      
      {/* Cabecera */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Link href="/admin/resultados" className="text-gray-500 hover:text-blue-600 flex items-center gap-1 mb-2 text-sm">
            <ArrowLeft size={16}/> Volver al Panel
          </Link>
          <h1 className="text-3xl font-bold text-gray-800">Analítica: {simulador.nombre}</h1>
          <p className="text-gray-500">Resultados en tiempo real</p>
        </div>
        
        <div className="flex flex-wrap gap-2">
           {/* NUEVO BOTÓN: EXPORTAR */}
           <button 
            onClick={exportarCSV}
            className="bg-emerald-100 text-emerald-700 border border-emerald-200 px-4 py-3 rounded-lg font-bold flex items-center gap-2 hover:bg-emerald-200 transition-colors"
            title="Descargar calificaciones en Excel"
          >
            <Download size={20}/> Exportar Excel
          </button>

           {/* BOTÓN RESETEAR */}
           <button 
            onClick={handleResetSimulator}
            className="bg-red-100 text-red-700 border border-red-200 px-4 py-3 rounded-lg font-bold flex items-center gap-2 hover:bg-red-200 transition-colors"
            title="Borrar todos los resultados de este simulador"
          >
            <Trash2 size={20}/> Resetear Clase
          </button>

          <button 
            onClick={cargarDatos}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-bold flex items-center gap-2 hover:bg-blue-700 shadow-lg transition-transform active:scale-95"
          >
            <RefreshCw size={20}/> Actualizar Datos
          </button>
        </div>
      </div>

      {/* Tarjetas de Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-4 bg-blue-100 text-blue-600 rounded-full">
            <Users size={32}/>
          </div>
          <div>
            <p className="text-gray-500 text-sm font-bold uppercase">Participantes</p>
            <p className="text-3xl font-extrabold text-gray-800">{stats.total}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className={`p-4 rounded-full ${stats.promedio >= 70 ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'}`}>
            <TrendingUp size={32}/>
          </div>
          <div>
            <p className="text-gray-500 text-sm font-bold uppercase">Promedio Clase</p>
            <p className="text-3xl font-extrabold text-gray-800">{stats.promedio}/100</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-4 bg-purple-100 text-purple-600 rounded-full">
            <Trophy size={32}/>
          </div>
          <div>
            <p className="text-gray-500 text-sm font-bold uppercase">Mejor Nota</p>
            <p className="text-3xl font-extrabold text-gray-800">{stats.mejor}/100</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* COLUMNA 1: SEMÁFORO DE PREGUNTAS */}
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <AlertTriangle className="text-orange-500"/> Preguntas más Difíciles
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            Estas son las preguntas donde más fallaron los alumnos. <br/>
            <span className="text-red-500 font-bold">Rojo = Necesita refuerzo urgente.</span>
          </p>

          <div className="space-y-6 max-h-[500px] overflow-y-auto pr-2">
            {analisisPreguntas.map((item, idx) => (
              <div key={item.id} className="relative">
                <div className="flex justify-between text-sm mb-1 font-medium">
                  <span className="truncate w-3/4 text-gray-700">
                    {idx + 1}. {item.texto}
                  </span>
                  <span className={item.tasaFallo > 50 ? 'text-red-600 font-bold' : 'text-gray-600'}>
                    {Math.round(item.tasaFallo)}% fallos
                  </span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                  <div 
                    className={`h-3 rounded-full transition-all ${
                      item.tasaFallo > 60 ? 'bg-red-500' : 
                      item.tasaFallo > 30 ? 'bg-yellow-400' : 'bg-green-500'
                    }`}
                    style={{ width: `${item.tasaFallo}%` }}
                  ></div>
                </div>
                {item.tasaFallo > 60 && (
                   <p className="text-xs text-red-500 mt-1 italic">Revisar este tema en clase</p>
                )}
              </div>
            ))}
            {analisisPreguntas.length === 0 && (
              <p className="text-gray-400 italic text-center">Aún no hay suficientes datos para analizar.</p>
            )}
          </div>
        </div>

        {/* COLUMNA 2: RANKING DE ALUMNOS */}
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Users className="text-blue-500"/> Últimos Resultados
          </h2>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-xs font-bold text-gray-500 border-b border-gray-200">
                  <th className="py-3">Estudiante</th>
                  <th className="py-3 text-center">Nota</th>
                  <th className="py-3 text-right">Hora (Ecuador)</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {resultados.map((res) => (
                  <tr key={res.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="py-3 font-medium text-gray-800">
                      {res.email ? res.email.split('@')[0] : 'Anónimo'}
                    </td>
                    <td className="py-3 text-center">
                      <span className={`px-2 py-1 rounded-md font-bold text-xs ${
                        res.puntaje >= 70 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {res.puntaje}/100
                      </span>
                    </td>
                    <td className="py-3 text-right text-gray-400 text-xs">
                      {new Date(res.created_at).toLocaleTimeString('es-EC', {
                        hour: '2-digit', 
                        minute: '2-digit',
                        timeZone: 'America/Guayaquil'
                      })}
                    </td>
                  </tr>
                ))}
                {resultados.length === 0 && (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-gray-400 italic">
                      Esperando respuestas...
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}