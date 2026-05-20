'use client';

import { useState, useEffect } from 'react';
import { useSupabase } from '../../components/AuthProvider';
import { 
  Eye, EyeOff, Copy, Move, Trash2, Search, 
  Plus, RefreshCw, CheckCircle, AlertCircle, Sparkles 
} from 'lucide-react';
import Link from 'next/link';

export default function GestionSimuladoresPage() {
  const { supabase } = useSupabase();
  const [simuladores, setSimuladores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedInst, setSelectedInst] = useState('TODAS');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchSimuladores = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('simuladores')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) setSimuladores(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchSimuladores();
  }, []);

  const showAlert = (type: 'success' | 'error', text: string) => {
    setAlert({ type, text });
    setTimeout(() => setAlert(null), 4000);
  };

  // 🌟 SOLUCIÓN: Lista dinámica de instituciones
  // Toma las 4 clásicas y le suma automáticamente cualquier otra (como MIES) que encuentre en los simuladores
  const instituciones = Array.from(
    new Set([
      'FAE', 'Armada', 'Ejército', 'Policía', 
      ...simuladores.map(sim => sim.institucion)
    ])
  ).filter(Boolean).sort(); // filter quita vacíos y sort las ordena alfabéticamente

  // 1. CAMBIAR PRIVACIDAD CON UN CLICK
  const togglePublico = async (id: string, currentStatus: boolean) => {
    setActionLoading(`public-${id}`);
    const { error } = await supabase
      .from('simuladores')
      .update({ publico: !currentStatus })
      .eq('id', id);

    if (error) {
      showAlert('error', 'No se pudo actualizar el estado de privacidad.');
    } else {
      setSimuladores(simuladores.map(s => s.id === id ? { ...s, publico: !currentStatus } : s));
      showAlert('success', 'Visibilidad del simulador actualizada con éxito.');
    }
    setActionLoading(null);
  };

  // 2. MOVER SIMULADOR A OTRA INSTITUCIÓN
  const moverSimulador = async (id: string, nuevaInst: string) => {
    if (!nuevaInst) return;
    setActionLoading(`move-${id}`);
    
    const { error } = await supabase
      .from('simuladores')
      .update({ institucion: nuevaInst })
      .eq('id', id);

    if (error) {
      showAlert('error', 'Error al mover el simulador.');
    } else {
      setSimuladores(simuladores.map(s => s.id === id ? { ...s, institucion: nuevaInst } : s));
      showAlert('success', `Simulador movido a la institución: ${nuevaInst}`);
    }
    setActionLoading(null);
  };

  // 3. COPIAR/DUPLICAR SIMULADOR POR COMPLETO (CON PREGUNTAS)
  const duplicarSimulador = async (simulador: any, destinoInst: string) => {
    setActionLoading(`copy-${simulador.id}`);
    const nuevoSlug = `${simulador.slug}-copia-${Math.floor(Math.random() * 10000)}`;

    try {
      // Clonar la fila del simulador
      const { data: nuevoSim, error: errSim } = await supabase
        .from('simuladores')
        .insert([{
          nombre: `${simulador.nombre} (Copia)`,
          slug: nuevoSlug,
          institucion: destinoInst,
          categoria: simulador.categoria,
          materia: simulador.materia,
          publico: simulador.publico
        }])
        .select()
        .single();

      if (errSim) throw errSim;

      // Buscar y clonar todas sus preguntas asociadas
      const { data: preguntas, error: errPreg } = await supabase
        .from('preguntas')
        .select('*')
        .eq('simulador_id', simulador.id);

      if (!errPreg && preguntas && preguntas.length > 0) {
        const preguntasClonadas = preguntas.map(({ id, created_at, simulador_id, ...resto }) => ({
          ...resto,
          simulador_id: nuevoSim.id
        }));

        const { error: errInsertPreg } = await supabase.from('preguntas').insert(preguntasClonadas);
        if (errInsertPreg) throw errInsertPreg;
      }

      showAlert('success', `¡Simulador y preguntas duplicadas con éxito en ${destinoInst}!`);
      fetchSimuladores();
    } catch (e) {
      showAlert('error', 'Hubo un problema al duplicar el simulador.');
    } finally {
      setActionLoading(null);
    }
  };

  // 4. ELIMINAR SIMULADOR
  const eliminarSimulador = async (id: string, nombre: string) => {
    if (!confirm(`¿Estás seguro de que deseas eliminar permanentemente el simulador "${nombre}"? Esta acción borrará todas sus preguntas y notas asociadas.`)) return;
    
    setActionLoading(`delete-${id}`);
    const { error } = await supabase.from('simuladores').delete().eq('id', id);

    if (error) {
      showAlert('error', 'No se pudo eliminar el simulador.');
    } else {
      setSimuladores(simuladores.filter(s => s.id !== id));
      showAlert('success', 'Simulador eliminado permanentemente.');
    }
    setActionLoading(null);
  };

  // Filtrado lógico en pantalla
  const simuladoresFiltrados = simuladores.filter(sim => {
    const matchesSearch = sim.nombre.toLowerCase().includes(search.toLowerCase()) || 
                          sim.materia.toLowerCase().includes(search.toLowerCase());
    const matchesInst = selectedInst === 'TODAS' || sim.institucion === selectedInst;
    return matchesSearch && matchesInst;
  });

  return (
    <div className="max-w-6xl mx-auto py-6">
      {/* Alertas dinámicas */}
      {alert && (
        <div className={`fixed top-5 right-5 z-50 p-4 rounded-xl shadow-xl flex items-center gap-3 font-semibold text-white border transition-all ${
          alert.type === 'success' ? 'bg-emerald-600 border-emerald-500' : 'bg-rose-600 border-rose-500'
        }`}>
          {alert.type === 'success' ? <CheckCircle className="w-5 h-5"/> : <AlertCircle className="w-5 h-5"/>}
          {alert.text}
        </div>
      )}

      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
            <Sparkles className="text-amber-500 w-8 h-8" /> Gestor de Simuladores
          </h1>
          <p className="text-gray-500 mt-1">Modifica, mueve, clona o cambia la visibilidad de tus exámenes en tiempo real.</p>
        </div>
        <Link 
          href="/admin/crear-simulador" 
          className="bg-primary hover:bg-blue-700 text-white px-5 py-3 rounded-xl font-bold flex items-center gap-2 shadow-md transition-all transform hover:-translate-y-0.5"
        >
          <Plus className="w-5 h-5" /> Nuevo Simulador
        </Link>
      </div>

      {/* Barra de Herramientas (Filtros) */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4 items-center mb-6">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-3.5 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Buscar por nombre o materia..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:bg-white text-gray-700"
          />
        </div>
        <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <button
            onClick={() => setSelectedInst('TODAS')}
            className={`px-4 py-2.5 rounded-xl font-semibold text-sm transition-all whitespace-nowrap ${
              selectedInst === 'TODAS' ? 'bg-slate-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Todas
          </button>
          {instituciones.map(inst => (
            <button
              key={inst}
              onClick={() => setSelectedInst(inst)}
              className={`px-4 py-2.5 rounded-xl font-semibold text-sm transition-all whitespace-nowrap ${
                selectedInst === inst ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {inst}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla / Lista de Simuladores */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500 flex flex-col items-center gap-3">
            <RefreshCw className="w-8 h-8 animate-spin text-primary" /> Cargando base de datos...
          </div>
        ) : simuladoresFiltrados.length === 0 ? (
          <div className="p-12 text-center text-gray-500">No se encontraron simuladores con los filtros seleccionados.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-500 font-bold text-xs uppercase border-b border-gray-100">
                  <th className="p-4">Simulador / Datos</th>
                  <th className="p-4 text-center">Visibilidad</th>
                  <th className="p-4">Mover De Institución</th>
                  <th className="p-4">Acciones Master</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {simuladoresFiltrados.map((sim) => (
                  <tr key={sim.id} className="hover:bg-gray-50/70 transition-colors">
                    {/* Información Básica */}
                    <td className="p-4">
                      <div className="flex items-start gap-2 flex-col">
                        <span className="px-2.5 py-0.5 bg-slate-100 text-slate-800 text-xs font-bold rounded-md uppercase border border-slate-200">
                          {sim.institucion}
                        </span>
                        <div className="font-bold text-gray-800 text-base mt-1">{sim.nombre}</div>
                        <div className="text-xs text-gray-400 mt-0.5">
                          {sim.categoria} • <span className="italic">{sim.materia}</span>
                        </div>
                      </div>
                    </td>

                    {/* Visibilidad Interactiva */}
                    <td className="p-4 text-center">
                      <button
                        onClick={() => togglePublico(sim.id, sim.publico)}
                        disabled={actionLoading === `public-${sim.id}`}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-bold text-xs shadow-sm border transition-all ${
                          sim.publico 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' 
                            : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                        }`}
                      >
                        {sim.publico ? (
                          <><Eye className="w-3.5 h-3.5"/> Público</>
                        ) : (
                          <><EyeOff className="w-3.5 h-3.5"/> Privado</>
                        )}
                      </button>
                    </td>

                    {/* Mover Institución Rápido */}
                    <td className="p-4">
                      <select
                        value={sim.institucion}
                        onChange={(e) => moverSimulador(sim.id, e.target.value)}
                        disabled={actionLoading !== null}
                        className="bg-gray-50 border border-gray-200 text-gray-700 text-xs rounded-lg p-2 focus:ring-1 focus:ring-primary focus:bg-white font-semibold cursor-pointer"
                      >
                        {instituciones.map(inst => (
                          <option key={inst} value={inst}>{inst}</option>
                        ))}
                      </select>
                    </td>

                    {/* Clonar y Eliminar */}
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        {/* Menú desplegable rápido para clonar en otra institución */}
                        <div className="relative group">
                          <button 
                            disabled={actionLoading !== null}
                            className="p-2 text-gray-500 hover:text-primary hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-1 text-xs font-bold border border-gray-100 shadow-sm bg-white"
                          >
                            <Copy className="w-4 h-4" /> Duplicar en...
                          </button>
                          <div className="absolute right-0 bottom-full mb-1 hidden group-hover:block bg-white border border-gray-200 rounded-xl shadow-xl py-1 z-10 w-40 animate-fade-in">
                            <p className="text-[10px] text-gray-400 font-bold px-3 py-1 uppercase tracking-wider">Destino:</p>
                            {instituciones.map(inst => (
                              <button
                                key={inst}
                                onClick={() => duplicarSimulador(sim, inst)}
                                className="w-full text-left px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 hover:text-primary transition-colors flex items-center gap-1.5"
                              >
                                <Move className="w-3 h-3 text-gray-400" /> {inst}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Eliminar permanentemente */}
                        <button
                          onClick={() => eliminarSimulador(sim.id, sim.nombre)}
                          disabled={actionLoading !== null}
                          className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-100"
                          title="Eliminar Simulador"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
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