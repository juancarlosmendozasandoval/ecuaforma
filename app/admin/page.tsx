'use client';

import { useEffect, useState } from 'react';
import { useSupabase } from '../components/AuthProvider';
import Link from 'next/link';
import { Edit, Trash2, ExternalLink, PlusCircle, Search, Shield } from 'lucide-react';

export default function AdminDashboardPage() {
  const { supabase } = useSupabase();
  const [simuladores, setSimuladores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const cargarSimuladores = async () => {
    const { data, error } = await supabase
      .from('simuladores')
      .select('*, preguntas(count)') // Traemos también el conteo de preguntas
      .order('created_at', { ascending: false });

    if (data) setSimuladores(data);
    setLoading(false);
  };

  useEffect(() => {
    cargarSimuladores();
  }, [supabase]);

  const handleDelete = async (id: string, nombre: string) => {
    if (!confirm(`¿ESTÁS SEGURO?\n\nVas a eliminar el simulador "${nombre}" y TODAS sus preguntas.\nEsta acción no se puede deshacer.`)) {
      return;
    }

    try {
      const { error } = await supabase.from('simuladores').delete().eq('id', id);
      if (error) throw error;
      
      alert('Simulador eliminado');
      cargarSimuladores(); // Recargar lista
    } catch (err: any) {
      alert('Error eliminando: ' + err.message);
    }
  };

  // Filtrado simple por nombre
  const filteredSims = simuladores.filter(s => 
    s.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.institucion.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="p-10 text-center">Cargando panel...</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      
      {/* Cabecera del Dashboard */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Shield className="text-blue-600"/> Panel de Administración
          </h1>
          <p className="text-gray-500">Gestiona tus {simuladores.length} simuladores activos</p>
        </div>
        <Link 
          href="/admin/crear-simulador" 
          className="bg-slate-900 text-white px-6 py-3 rounded-lg font-bold hover:bg-slate-800 transition flex items-center gap-2 shadow-lg"
        >
          <PlusCircle size={20} /> Crear Nuevo
        </Link>
      </div>

      {/* Barra de Búsqueda */}
      <div className="relative">
        <Search className="absolute left-3 top-3 text-gray-400" size={20} />
        <input 
          type="text" 
          placeholder="Buscar por nombre o institución..." 
          className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Tabla de Simuladores */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {filteredSims.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No se encontraron simuladores.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider">
                <tr>
                  <th className="p-4 font-bold">Simulador</th>
                  <th className="p-4 font-bold">Institución</th>
                  <th className="p-4 font-bold text-center">Preguntas</th>
                  <th className="p-4 font-bold text-center">Estado</th>
                  <th className="p-4 font-bold text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredSims.map((sim) => (
                  <tr key={sim.id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-gray-800">{sim.nombre}</div>
                      <div className="text-xs text-gray-400">{sim.categoria} • {sim.materia}</div>
                    </td>
                    <td className="p-4 text-sm text-gray-600">
                      <span className="bg-gray-100 px-2 py-1 rounded text-xs font-bold uppercase">
                        {sim.institucion}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-bold">
                        {sim.preguntas[0]?.count || 0}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      {sim.publico ? (
                        <span className="text-green-600 text-xs font-bold flex justify-center items-center gap-1">
                          ● Público
                        </span>
                      ) : (
                        <span className="text-amber-600 text-xs font-bold flex justify-center items-center gap-1">
                          ● Privado
                        </span>
                      )}
                    </td>
                    <td className="p-4 flex justify-end gap-2">
                      {/* Ver en Web */}
                      <Link 
                        href={`/simulador/${sim.slug}`} 
                        target="_blank"
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                        title="Ver simulador real"
                      >
                        <ExternalLink size={18} />
                      </Link>

                      {/* Editar Preguntas */}
                      <Link 
                        href={`/admin/preguntas/${sim.slug}`}
                        className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition"
                        title="Gestionar preguntas"
                      >
                        <Edit size={18} />
                      </Link>

                      {/* Eliminar */}
                      <button 
                        onClick={() => handleDelete(sim.id, sim.nombre)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                        title="Eliminar simulador"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}