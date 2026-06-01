'use client';

import { useState, useEffect } from 'react';
import { useSupabase } from '../../components/AuthProvider';
import { 
  Eye, EyeOff, Copy, Move, Trash2, Search, 
  Plus, RefreshCw, CheckCircle, AlertCircle, Sparkles, Pencil, Save, ListChecks, DollarSign, X
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

  // Estados para controlar la edición inline TOTAL
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNombre, setEditNombre] = useState('');
  const [editSlug, setEditSlug] = useState('');
  const [editCategoria, setEditCategoria] = useState('');
  const [editMateria, setEditMateria] = useState('');
  
  // 🌟 NUEVOS ESTADOS PARA MANEJAR PRECIOS EN SIMULADORES
  const [editEsPago, setEditEsPago] = useState(false);
  const [editPrecio, setEditPrecio] = useState('0.00');

  const fetchSimuladores = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('simuladores')
      .select('*')
      .eq('is_deleted', false) // Solo traer los activos
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

  // Lista dinámica de instituciones
  const instituciones = Array.from(
    new Set([
      'FAE', 'Armada', 'Ejército', 'Policía', 
      ...simuladores.map(sim => sim.institucion)
    ])
  ).filter(Boolean).sort();

  // Activar el modo edición guardando todos los valores actuales
  const iniciarEdicion = (sim: any) => {
    setEditingId(sim.id);
    setEditNombre(sim.nombre);
    setEditSlug(sim.slug);
    setEditCategoria(sim.categoria || '');
    setEditMateria(sim.materia || '');
    
    // 🌟 CARGAMOS LOS DATOS DEL PRECIO
    setEditEsPago(sim.es_pago || false);
    setEditPrecio(sim.precio ? sim.precio.toString() : '0.00');
  };

  const cancelarEdicion = () => {
    setEditingId(null);
    setEditNombre('');
    setEditSlug('');
    setEditCategoria('');
    setEditMateria('');
    setEditEsPago(false);
    setEditPrecio('0.00');
  };

  // 🌟 GUARDAR TODOS LOS CAMPOS EDITADOS (INCLUYENDO PRECIO)
  const guardarEdicion = async (id: string) => {
    if (!editNombre.trim() || !editSlug.trim()) {
      showAlert('error', 'El nombre y la URL no pueden estar vacíos.');
      return;
    }

    // Limpieza automática del Slug
    const slugLimpio = editSlug
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") 
      .replace(/[^a-z0-9-_]/g, '-')    
      .replace(/-+/g, '-');            

    setActionLoading(`edit-${id}`);

    const datosActualizados = { 
      nombre: editNombre.trim(), 
      slug: slugLimpio,
      categoria: editCategoria.trim(),
      materia: editMateria.trim(),
      es_pago: editEsPago, // 🌟 Actualizamos si es de pago
      precio: editEsPago ? parseFloat(editPrecio) : 0.00 // 🌟 Actualizamos el precio
    };

    const { error } = await supabase
      .from('simuladores')
      .update(datosActualizados)
      .eq('id', id);

    if (error) {
      if (error.code === '23505') {
        showAlert('error', 'Esa URL (Slug) ya existe en otro simulador.');
      } else {
        showAlert('error', 'Error al actualizar el simulador.');
      }
    } else {
      setSimuladores(simuladores.map(s => s.id === id ? { ...s, ...datosActualizados } : s));
      showAlert('success', 'Simulador actualizado con éxito.');
      setEditingId(null);
    }
    setActionLoading(null);
  };

  // CAMBIAR PRIVACIDAD
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
      showAlert('success', 'Visibilidad actualizada con éxito.');
    }
    setActionLoading(null);
  };

  // MOVER SIMULADOR A OTRA INSTITUCIÓN
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
      showAlert('success', `Movido a: ${nuevaInst}`);
    }
    setActionLoading(null);
  };

  // COPIAR/DUPLICAR SIMULADOR
  const duplicarSimulador = async (simulador: any, destinoInst: string) => {
    setActionLoading(`copy-${simulador.id}`);
    const nuevoSlug = `${simulador.slug}-copia-${Math.floor(Math.random() * 10000)}`;

    try {
      const { data: nuevoSim, error: errSim } = await supabase
        .from('simuladores')
        .insert([{
          nombre: `${simulador.nombre} (Copia)`,
          slug: nuevoSlug,
          institucion: destinoInst,
          categoria: simulador.categoria,
          materia: simulador.materia,
          publico: simulador.publico,
          es_pago: simulador.es_pago, // 🌟 Copiamos configuración de pago
          precio: simulador.precio // 🌟 Copiamos el precio
        }])
        .select()
        .single();

      if (errSim) throw errSim;

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

      showAlert('success', `¡Simulador duplicado con éxito en ${destinoInst}!`);
      fetchSimuladores();
    } catch (e) {
      showAlert('error', 'Hubo un problema al duplicar el simulador.');
    } finally {
      setActionLoading(null);
    }
  };

  // ELIMINAR SIMULADOR (Soft Delete)
  const eliminarSimulador = async (id: string, nombre: string) => {
    if (!confirm(`¿Mandar el simulador "${nombre}" al archivo? Los alumnos ya no podrán verlo.`)) return;
    
    setActionLoading(`delete-${id}`);
    
    const { error } = await supabase
      .from('simuladores')
      .update({ is_deleted: true }) 
      .eq('id', id);

    if (error) {
      showAlert('error', 'No se pudo archivar el simulador.');
    } else {
      setSimuladores(simuladores.filter(s => s.id !== id));
      showAlert('success', 'Simulador archivado correctamente.');
    }
    setActionLoading(null);
  };

  // Filtrado lógico
  const simuladoresFiltrados = simuladores.filter(sim => {
    const term = search.toLowerCase();
    const materiaStr = sim.materia ? sim.materia.toLowerCase() : '';
    const categoriaStr = sim.categoria ? sim.categoria.toLowerCase() : '';
    
    const matchesSearch = sim.nombre.toLowerCase().includes(term) || 
                          materiaStr.includes(term) ||
                          categoriaStr.includes(term);
                          
    const matchesInst = selectedInst === 'TODAS' || sim.institucion === selectedInst;
    return matchesSearch && matchesInst;
  });

  return (
    <div className="max-w-6xl mx-auto py-6">
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

      {/* Barra de Herramientas */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4 items-center mb-6">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-3.5 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Buscar por nombre, materia o categoría..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:bg-white text-gray-700 outline-none"
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

      {/* Tabla de Simuladores */}
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
                  <th className="p-4 text-right">Acciones Master</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {simuladoresFiltrados.map((sim) => {
                  const isEditing = editingId === sim.id;

                  return (
                    <tr key={sim.id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="p-4 align-top">
                        <div className="flex items-start gap-2 flex-col w-full">
                          
                          {/* 🌟 INSIGNIAS DE INSTITUCIÓN Y PRECIO */}
                          <div className="flex items-center gap-2 mb-1">
                            <span className="px-2.5 py-0.5 bg-slate-100 text-slate-800 text-[10px] font-bold rounded-md uppercase border border-slate-200">
                              {sim.institucion}
                            </span>
                            <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md border ${sim.es_pago ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                              {sim.es_pago ? `$${sim.precio}` : 'GRATIS'}
                            </span>
                          </div>
                          
                          {isEditing ? (
                            <div className="flex flex-col gap-3 w-full mt-2 min-w-[280px] bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 shadow-inner">
                              <h3 className="text-sm font-bold text-indigo-800 flex items-center gap-2 border-b border-indigo-100 pb-2 mb-1">
                                <Pencil className="w-4 h-4"/> Editando Simulador
                              </h3>
                              
                              <div>
                                <label className="text-[10px] font-bold text-indigo-700 uppercase mb-1 block">Nombre del Simulador</label>
                                <input
                                  type="text"
                                  value={editNombre}
                                  onChange={(e) => setEditNombre(e.target.value)}
                                  className="p-2 text-sm border border-indigo-200 rounded-lg text-gray-800 font-bold bg-white focus:ring-2 focus:ring-indigo-500 outline-none w-full"
                                />
                              </div>
                              
                              <div>
                                <label className="text-[10px] font-bold text-indigo-700 uppercase mb-1 block">URL (Slug)</label>
                                <div className="flex items-center gap-1 text-xs text-gray-500 w-full">
                                  <span className="font-mono bg-indigo-100 p-2 rounded-lg border border-indigo-200">/simulador/</span>
                                  <input
                                    type="text"
                                    value={editSlug}
                                    onChange={(e) => setEditSlug(e.target.value)}
                                    className="p-2 text-xs border border-indigo-200 rounded-lg text-gray-700 font-mono bg-white focus:ring-2 focus:ring-indigo-500 outline-none flex-1"
                                  />
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="text-[10px] font-bold text-indigo-700 uppercase mb-1 block">Categoría</label>
                                  <input
                                    type="text"
                                    value={editCategoria}
                                    onChange={(e) => setEditCategoria(e.target.value)}
                                    className="p-2 text-xs border border-indigo-200 rounded-lg text-gray-700 bg-white focus:ring-2 focus:ring-indigo-500 outline-none w-full"
                                    placeholder="Ej: Matemáticas"
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] font-bold text-indigo-700 uppercase mb-1 block">Materia</label>
                                  <input
                                    type="text"
                                    value={editMateria}
                                    onChange={(e) => setEditMateria(e.target.value)}
                                    className="p-2 text-xs border border-indigo-200 rounded-lg text-gray-700 bg-white focus:ring-2 focus:ring-indigo-500 outline-none w-full"
                                    placeholder="Ej: Álgebra"
                                  />
                                </div>
                              </div>

                              {/* 🌟 CONFIGURACIÓN DE PRECIO AL EDITAR */}
                              <div className="mt-2 pt-3 border-t border-indigo-100">
                                <label className="text-[10px] font-bold text-indigo-700 uppercase mb-2 block">Costo de Acceso</label>
                                <div className="flex items-center gap-3">
                                  <div className="flex bg-white border border-indigo-200 rounded-lg p-1">
                                    <button 
                                      type="button" 
                                      onClick={() => setEditEsPago(false)} 
                                      className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${!editEsPago ? 'bg-gray-100 text-gray-800 shadow-sm' : 'text-gray-400 hover:bg-gray-50'}`}
                                    >
                                      Gratis
                                    </button>
                                    <button 
                                      type="button" 
                                      onClick={() => setEditEsPago(true)} 
                                      className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${editEsPago ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-400 hover:bg-gray-50'}`}
                                    >
                                      De Pago
                                    </button>
                                  </div>
                                  
                                  {editEsPago && (
                                    <div className="flex items-center gap-1.5 bg-white border border-emerald-200 rounded-lg p-1 animate-fade-in pl-2">
                                      <DollarSign className="w-4 h-4 text-emerald-600"/>
                                      <input 
                                        type="number" 
                                        step="0.01" 
                                        min="0"
                                        value={editPrecio} 
                                        onChange={(e)=>setEditPrecio(e.target.value)} 
                                        className="w-20 p-1 text-sm font-bold text-emerald-700 outline-none" 
                                      />
                                    </div>
                                  )}
                                </div>
                              </div>

                            </div>
                          ) : (
                            <>
                              <div className="font-bold text-gray-800 text-base mt-1">{sim.nombre}</div>
                              <div className="text-xs text-gray-500 font-mono bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100 mt-1">
                                URL: /simulador/{sim.slug}
                              </div>
                              <div className="text-xs text-gray-500 mt-1.5 font-medium flex items-center gap-1.5">
                                <span className="bg-gray-100 px-2 py-0.5 rounded text-gray-600">{sim.categoria || 'Sin categoría'}</span>
                                {sim.materia && <span className="italic text-gray-400">• {sim.materia}</span>}
                              </div>
                            </>
                          )}
                        </div>
                      </td>

                      <td className="p-4 text-center align-top pt-8">
                        <button
                          onClick={() => togglePublico(sim.id, sim.publico)}
                          disabled={actionLoading !== null || isEditing}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-bold text-xs shadow-sm border transition-all ${
                            sim.publico 
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' 
                              : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                          } ${isEditing ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          {sim.publico ? (
                            <><Eye className="w-3.5 h-3.5"/> Público</>
                          ) : (
                            <><EyeOff className="w-3.5 h-3.5"/> Privado</>
                          )}
                        </button>
                      </td>

                      <td className="p-4 align-top pt-8">
                        <select
                          value={sim.institucion}
                          onChange={(e) => moverSimulador(sim.id, e.target.value)}
                          disabled={actionLoading !== null || isEditing}
                          className={`bg-gray-50 border border-gray-200 text-gray-700 text-xs rounded-lg p-2 outline-none focus:ring-2 focus:ring-primary focus:bg-white font-semibold cursor-pointer w-full max-w-[150px] ${isEditing ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          {instituciones.map(inst => (
                            <option key={inst} value={inst}>{inst}</option>
                          ))}
                        </select>
                      </td>

                      <td className="p-4 align-top pt-8 text-right">
                        {isEditing ? (
                          <div className="flex flex-col items-end gap-2">
                            <button
                              onClick={() => guardarEdicion(sim.id)}
                              disabled={actionLoading !== null}
                              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition-colors flex items-center gap-1 w-full justify-center"
                            >
                              <Save className="w-4 h-4"/> Guardar
                            </button>
                            <button
                              onClick={cancelarEdicion}
                              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl text-xs font-bold transition-colors w-full justify-center flex items-center gap-1"
                            >
                              <X className="w-4 h-4"/> Cancelar
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-2">
                            
                            <Link
                              href={`/admin/preguntas/${sim.slug}`}
                              className="px-3 py-2 text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-bold shadow-md"
                              title="Gestionar Preguntas"
                            >
                              <ListChecks className="w-4 h-4" /> Preguntas
                            </Link>

                            <button
                              onClick={() => iniciarEdicion(sim)}
                              disabled={actionLoading !== null}
                              className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-gray-100 shadow-sm bg-white"
                              title="Editar Metadatos"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>

                            <div className="relative group">
                              <button 
                                disabled={actionLoading !== null}
                                className="p-2 text-gray-500 hover:text-primary hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-1 border border-gray-100 shadow-sm bg-white"
                                title="Duplicar"
                              >
                                <Copy className="w-4 h-4" />
                              </button>
                              <div className="absolute right-0 top-full mt-1 hidden group-hover:block bg-white border border-gray-200 rounded-xl shadow-xl py-1 z-10 w-40 animate-fade-in">
                                <p className="text-[10px] text-gray-400 font-bold px-3 py-1 uppercase tracking-wider border-b border-gray-50 mb-1">Copiar a:</p>
                                {instituciones.map(inst => (
                                  <button
                                    key={inst}
                                    onClick={() => duplicarSimulador(sim, inst)}
                                    className="w-full text-left px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:text-primary transition-colors flex items-center gap-1.5"
                                  >
                                    <Move className="w-3 h-3 text-gray-400" /> {inst}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <button
                              onClick={() => eliminarSimulador(sim.id, sim.nombre)}
                              disabled={actionLoading !== null}
                              className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-100"
                              title="Eliminar"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}