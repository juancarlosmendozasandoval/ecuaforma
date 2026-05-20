'use client';

import { useEffect, useState } from 'react';
import { useSupabase } from '../components/AuthProvider';
import Link from 'next/link';
import { Shield, BookOpen, Users, Activity, ArrowRight, Settings } from 'lucide-react';

export default function AdminDashboardPage() {
  const { supabase } = useSupabase();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalSims: 0, totalIntentos: 0, promedioGeneral: 0 });
  const [actividadReciente, setActividadReciente] = useState<any[]>([]);

  useEffect(() => {
    const cargarResumen = async () => {
      // 1. Contar Simuladores
      const { count: countSims } = await supabase.from('simuladores').select('*', { count: 'exact', head: true });
      
      // 2. Traer intentos para estadísticas
      const { data: resultados } = await supabase.from('resultados').select('puntaje, created_at, email');
      
      let intentos = 0;
      let sumaNotas = 0;
      
      if (resultados && resultados.length > 0) {
        intentos = resultados.length;
        sumaNotas = resultados.reduce((acc, curr) => acc + curr.puntaje, 0);
        // Ordenar por fecha para la actividad reciente (últimos 5)
        setActividadReciente(resultados.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5));
      }

      setStats({
        totalSims: countSims || 0,
        totalIntentos: intentos,
        promedioGeneral: intentos > 0 ? (sumaNotas / intentos) : 0
      });
      setLoading(false);
    };

    cargarResumen();
  }, [supabase]);

  if (loading) return <div className="p-10 text-center animate-pulse">Cargando Centro de Mando...</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      
      {/* Cabecera del Dashboard */}
      <div className="bg-slate-900 p-8 rounded-2xl shadow-xl text-white">
        <h1 className="text-3xl font-bold flex items-center gap-3 mb-2">
          <Shield className="text-blue-400 w-8 h-8"/> Centro de Mando Ecuaforma
        </h1>
        <p className="text-slate-400">Resumen general del rendimiento de la academia.</p>
      </div>

      {/* Tarjetas KPI */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition">
          <div className="p-4 bg-blue-50 text-blue-600 rounded-xl"><BookOpen size={28}/></div>
          <div>
            <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Simuladores Activos</p>
            <p className="text-3xl font-extrabold text-gray-800">{stats.totalSims}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition">
          <div className="p-4 bg-emerald-50 text-emerald-600 rounded-xl"><Users size={28}/></div>
          <div>
            <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Pruebas Rendidas</p>
            <p className="text-3xl font-extrabold text-gray-800">{stats.totalIntentos}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition">
          <div className="p-4 bg-purple-50 text-purple-600 rounded-xl"><Activity size={28}/></div>
          <div>
            <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Promedio Global</p>
            <p className="text-3xl font-extrabold text-gray-800">{stats.promedioGeneral.toFixed(1)} <span className="text-sm text-gray-400 font-medium">/ 100</span></p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Accesos Directos */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Gestión Rápida</h2>
          <div className="space-y-3">
            <Link href="/admin/simuladores" className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-blue-50 hover:text-blue-700 transition group">
              <div className="flex items-center gap-3 font-semibold">
                <Settings className="text-gray-400 group-hover:text-blue-600" size={20}/> 
                Administrar Simuladores
              </div>
              <ArrowRight size={18} className="text-gray-400 group-hover:translate-x-1 transition-transform"/>
            </Link>
            <Link href="/admin/resultados" className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-emerald-50 hover:text-emerald-700 transition group">
              <div className="flex items-center gap-3 font-semibold">
                <Activity className="text-gray-400 group-hover:text-emerald-600" size={20}/> 
                Ver Calificaciones de Clases
              </div>
              <ArrowRight size={18} className="text-gray-400 group-hover:translate-x-1 transition-transform"/>
            </Link>
          </div>
        </div>

        {/* Actividad Reciente */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Últimos Alumnos Evaluados</h2>
          {actividadReciente.length > 0 ? (
            <div className="space-y-4">
              {actividadReciente.map((act, idx) => (
                <div key={idx} className="flex justify-between items-center border-b border-gray-50 pb-2">
                  <div className="text-sm font-medium text-gray-700">
                    {act.email ? act.email.split('@')[0] : 'Alumno Anónimo'}
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${act.puntaje >= 70 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {act.puntaje}/100
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(act.created_at).toLocaleDateString('es-EC')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm italic">Aún no hay pruebas registradas en la academia.</p>
          )}
        </div>
      </div>
    </div>
  );
}