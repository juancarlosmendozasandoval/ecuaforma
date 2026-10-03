'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useSupabase } from '../../components/AuthProvider';
import {
  Eye, EyeOff, Copy, Move, Trash2, Search, Plus, CheckCircle, AlertCircle,
  Sparkles, Pencil, Save, ListChecks, DollarSign, X, ChevronLeft, ChevronRight, BarChart3, Shuffle,
} from 'lucide-react';
import Link from 'next/link';
import type { Tables } from '@/types/supabase';
import {
  CONFIG_ESTATICA,
  configDesdeSimulador,
  validarConfigDinamica,
  type ConfigDinamica as Config,
  type MateriaSelector,
  type TemaSelector,
} from '@/lib/simuladores/configDinamica';
import ConfigDinamica from './ConfigDinamica';
import { actualizarSimulador } from './acciones';

type SimuladorAdmin = Tables<'simuladores'>;

type Props = {
  simuladores: SimuladorAdmin[];
  instituciones: string[];
  temas: TemaSelector[];
  materias: MateriaSelector[];
  q: string;
  institucion: string;
  pagina: number;
  totalPaginas: number;
  total: number;
  porPagina: number;
  errorLista: string;
};

export default function SimuladoresCliente({
  simuladores,
  instituciones,
  temas,
  materias,
  q,
  institucion,
  pagina,
  totalPaginas,
  total,
  porPagina,
  errorLista,
}: Props) {
  const { supabase } = useSupabase();
  const router = useRouter();
  const pathname = usePathname();

  const [busqueda, setBusqueda] = useState(q);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNombre, setEditNombre] = useState('');
  const [editSlug, setEditSlug] = useState('');
  const [editMateriaId, setEditMateriaId] = useState('');
  const nombreMateria = (materiaId: string | null) => materias.find((m) => m.id === materiaId)?.nombre || '';
  const [editEsPago, setEditEsPago] = useState(false);
  const [editPrecio, setEditPrecio] = useState('0.00');
  const [editConfig, setEditConfig] = useState<Config>(CONFIG_ESTATICA);

  useEffect(() => {
    setBusqueda(q);
  }, [q]);

  useEffect(() => {
    const texto = busqueda.trim().slice(0, 100);
    if (texto === q) return;
    const timer = setTimeout(() => {
      escribirUrl({ q: texto, pagina: null });
    }, 300);
    return () => clearTimeout(timer);
  }, [busqueda, q, institucion, pathname]);

  const showAlert = (type: 'success' | 'error', text: string) => {
    setAlert({ type, text });
    setTimeout(() => setAlert(null), 4000);
  };

  const escribirUrl = (cambios: { q?: string | null; inst?: string | null; pagina?: string | null }) => {
    const siguiente = {
      q,
      inst: institucion,
      pagina: pagina > 1 ? String(pagina) : '',
    };
    if ('q' in cambios) siguiente.q = cambios.q || '';
    if ('inst' in cambios) siguiente.inst = cambios.inst || '';
    if ('pagina' in cambios) siguiente.pagina = cambios.pagina && cambios.pagina !== '1' ? cambios.pagina : '';
    if (('q' in cambios || 'inst' in cambios) && !('pagina' in cambios)) siguiente.pagina = '';

    const params = new URLSearchParams();
    if (siguiente.q) params.set('q', siguiente.q);
    if (siguiente.inst) params.set('inst', siguiente.inst);
    if (siguiente.pagina) params.set('pagina', siguiente.pagina);
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const opcionesInstitucion = (actual: string | null) => {
    const conjunto = new Set(instituciones);
    if (actual) conjunto.add(actual);
    return Array.from(conjunto).sort((a, b) => a.localeCompare(b, 'es'));
  };

  const iniciarEdicion = (sim: SimuladorAdmin) => {
    setEditingId(sim.id);
    setEditNombre(sim.nombre || '');
    setEditSlug(sim.slug || '');
    setEditMateriaId(sim.materia_id || '');
    setEditEsPago(!!sim.es_pago);
    setEditPrecio(sim.precio ? sim.precio.toString() : '0.00');
    setEditConfig(configDesdeSimulador(sim));
  };

  const cancelarEdicion = () => {
    setEditingId(null);
    setEditNombre('');
    setEditSlug('');
    setEditMateriaId('');
    setEditEsPago(false);
    setEditPrecio('0.00');
    setEditConfig(CONFIG_ESTATICA);
  };

  const guardarEdicion = async (id: string) => {
    if (!editNombre.trim() || !editSlug.trim()) {
      showAlert('error', 'El nombre y la URL no pueden estar vacíos.');
      return;
    }
    if (!editMateriaId) {
      showAlert('error', 'Selecciona la materia del simulador.');
      return;
    }
    const config = validarConfigDinamica(editConfig);
    if (!config.ok) {
      showAlert('error', config.mensaje);
      return;
    }

    setActionLoading(`edit-${id}`);
    let resultado: Awaited<ReturnType<typeof actualizarSimulador>>;
    try {
      resultado = await actualizarSimulador(id, {
        nombre: editNombre,
        slug: editSlug,
        materia_id: editMateriaId,
        es_pago: editEsPago,
        precio: editPrecio,
        ...config.datos,
      });
    } catch {
      resultado = { ok: false, mensaje: 'Error al actualizar el simulador.' };
    }
    setActionLoading(null);

    if (!resultado.ok) {
      showAlert('error', resultado.mensaje);
      return;
    }
    showAlert('success', 'Simulador actualizado con éxito.');
    setEditingId(null);
    router.refresh();
  };

  const togglePublico = async (id: string, currentStatus: boolean) => {
    setActionLoading(`public-${id}`);
    const { error } = await supabase.from('simuladores').update({ publico: !currentStatus }).eq('id', id);
    setActionLoading(null);
    if (error) {
      showAlert('error', 'No se pudo actualizar el estado de privacidad.');
      return;
    }
    showAlert('success', 'Visibilidad actualizada con éxito.');
    router.refresh();
  };

  const moverSimulador = async (id: string, nuevaInst: string) => {
    if (!nuevaInst) return;
    setActionLoading(`move-${id}`);
    const { error } = await supabase.from('simuladores').update({ institucion: nuevaInst }).eq('id', id);
    setActionLoading(null);
    if (error) {
      showAlert('error', 'Error al mover el simulador.');
      return;
    }
    showAlert('success', `Movido a: ${nuevaInst}`);
    router.refresh();
  };

  const duplicarSimulador = async (simulador: SimuladorAdmin, destinoInst: string) => {
    setActionLoading(`copy-${simulador.id}`);
    const nuevoSlug = `${simulador.slug || 'sim'}-copia-${Math.floor(Math.random() * 10000)}`;

    try {
      const { data: nuevoSim, error: errSim } = await supabase
        .from('simuladores')
        .insert([{
          nombre: `${simulador.nombre || 'Sin nombre'} (Copia)`,
          slug: nuevoSlug,
          institucion: destinoInst,
          materia_id: simulador.materia_id,
          materia: simulador.materia,
          publico: simulador.publico,
          es_pago: simulador.es_pago,
          precio: simulador.precio,
          ...configDesdeSimulador(simulador),
        }])
        .select()
        .single();

      if (errSim) throw errSim;

      const { data: vinculos, error: errPreg } = await supabase
        .from('simulador_preguntas')
        .select('pregunta_id, orden')
        .eq('simulador_id', simulador.id)
        .order('orden', { ascending: true });

      if (errPreg) throw errPreg;

      if (vinculos && vinculos.length > 0) {
        const copias = vinculos.map((fila) => ({
          simulador_id: nuevoSim.id,
          pregunta_id: fila.pregunta_id,
          orden: fila.orden,
        }));
        const { error: errInsertPreg } = await supabase.from('simulador_preguntas').insert(copias);
        if (errInsertPreg) throw errInsertPreg;
      }

      showAlert('success', `¡Simulador duplicado con éxito en ${destinoInst}!`);
      router.refresh();
    } catch {
      showAlert('error', 'Hubo un problema al duplicar el simulador.');
    } finally {
      setActionLoading(null);
    }
  };

  const eliminarSimulador = async (id: string, nombre: string | null) => {
    if (!confirm(`¿Mandar el simulador "${nombre || 'Sin nombre'}" al archivo? Los alumnos ya no podrán verlo.`)) return;

    setActionLoading(`delete-${id}`);
    const { error } = await supabase.from('simuladores').update({ is_deleted: true }).eq('id', id);
    setActionLoading(null);
    if (error) {
      showAlert('error', 'No se pudo archivar el simulador.');
      return;
    }
    showAlert('success', 'Simulador archivado correctamente.');
    if (editingId === id) cancelarEdicion();
    router.refresh();
  };

  const desde = total === 0 ? 0 : (pagina - 1) * porPagina + 1;
  const hasta = Math.min((pagina - 1) * porPagina + simuladores.length, total);

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

      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4 items-center mb-6">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-3.5 text-gray-400 w-5 h-5" />
          <input
            type="search"
            placeholder="Buscar por nombre..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:bg-white text-gray-700 outline-none"
          />
        </div>
        <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <button
            type="button"
            onClick={() => escribirUrl({ inst: null })}
            className={`px-4 py-2.5 rounded-xl font-semibold text-sm transition-all whitespace-nowrap ${
              !institucion ? 'bg-slate-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Todas
          </button>
          {instituciones.map((inst) => (
            <button
              key={inst}
              type="button"
              onClick={() => escribirUrl({ inst })}
              className={`px-4 py-2.5 rounded-xl font-semibold text-sm transition-all whitespace-nowrap ${
                institucion === inst ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {inst}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {errorLista ? (
          <div className="p-12 text-center text-rose-600">{errorLista}</div>
        ) : simuladores.length === 0 ? (
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
                {simuladores.map((sim) => {
                  const isEditing = editingId === sim.id;
                  const opciones = opcionesInstitucion(sim.institucion);

                  return (
                    <tr key={sim.id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="p-4 align-top">
                        <div className="flex items-start gap-2 flex-col w-full">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="px-2.5 py-0.5 bg-slate-100 text-slate-800 text-[10px] font-bold rounded-md uppercase border border-slate-200">
                              {sim.institucion || 'Sin Institución'}
                            </span>
                            <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md border ${sim.es_pago ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                              {sim.es_pago ? `$${sim.precio ?? 0}` : 'GRATIS'}
                            </span>
                            {sim.es_dinamico && (
                              <span
                                className="px-2 py-0.5 text-[10px] font-bold rounded-md border bg-violet-50 text-violet-700 border-violet-200 inline-flex items-center gap-1"
                                title={`${(sim.temas_dinamicos || []).length} temas`}
                              >
                                <Shuffle className="w-3 h-3" /> DINÁMICO · {sim.cantidad_preguntas || 0} preg.
                              </span>
                            )}
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
                              <div>
                                <label htmlFor={`materia-${sim.id}`} className="text-[10px] font-bold text-indigo-700 uppercase mb-1 block">Materia</label>
                                <select
                                  id={`materia-${sim.id}`}
                                  value={editMateriaId}
                                  onChange={(e) => setEditMateriaId(e.target.value)}
                                  className="p-2 text-xs border border-indigo-200 rounded-lg text-gray-700 bg-white focus:ring-2 focus:ring-indigo-500 outline-none w-full"
                                >
                                  <option value="" disabled>Selecciona la materia</option>
                                  {materias.map((materia) => (
                                    <option key={materia.id} value={materia.id}>{materia.nombre}</option>
                                  ))}
                                </select>
                              </div>
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
                                    <div className="flex items-center gap-1.5 bg-white border border-emerald-200 rounded-lg p-1 pl-2">
                                      <DollarSign className="w-4 h-4 text-emerald-600"/>
                                      <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={editPrecio}
                                        onChange={(e) => setEditPrecio(e.target.value)}
                                        className="w-20 p-1 text-sm font-bold text-emerald-700 outline-none"
                                      />
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="mt-2 pt-3 border-t border-indigo-100">
                                <ConfigDinamica
                                  temas={temas}
                                  valor={editConfig}
                                  onChange={setEditConfig}
                                  materiaId={editMateriaId || null}
                                  disabled={actionLoading !== null}
                                />
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="font-bold text-gray-800 text-base mt-1">{sim.nombre || 'Simulador sin nombre'}</div>
                              <div className="text-xs text-gray-500 font-mono bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100 mt-1">
                                URL: /simulador/{sim.slug || 'sin-url'}
                              </div>
                              <div className="text-xs text-gray-500 mt-1.5 font-medium flex items-center gap-1.5">
                                {nombreMateria(sim.materia_id) ? (
                                  <span className="bg-gray-100 px-2 py-0.5 rounded text-gray-600">{nombreMateria(sim.materia_id)}</span>
                                ) : (
                                  <span
                                    className="bg-amber-50 border border-amber-200 px-2 py-0.5 rounded text-amber-700 font-bold"
                                    title="Sin materia no aparece en el catálogo público. Edítalo para asignarla."
                                  >
                                    Sin materia
                                  </span>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      </td>

                      <td className="p-4 text-center align-top pt-8">
                        <button
                          type="button"
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
                          value={sim.institucion || ''}
                          onChange={(e) => moverSimulador(sim.id, e.target.value)}
                          disabled={actionLoading !== null || isEditing}
                          className={`bg-gray-50 border border-gray-200 text-gray-700 text-xs rounded-lg p-2 outline-none focus:ring-2 focus:ring-primary focus:bg-white font-semibold cursor-pointer w-full max-w-[150px] ${isEditing ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          {opciones.map((inst) => (
                            <option key={inst} value={inst}>{inst}</option>
                          ))}
                        </select>
                      </td>

                      <td className="p-4 align-top pt-8 text-right">
                        {isEditing ? (
                          <div className="flex flex-col items-end gap-2">
                            <button
                              type="button"
                              onClick={() => guardarEdicion(sim.id)}
                              disabled={actionLoading !== null}
                              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition-colors flex items-center gap-1 w-full justify-center"
                            >
                              <Save className="w-4 h-4"/> Guardar
                            </button>
                            <button
                              type="button"
                              onClick={cancelarEdicion}
                              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl text-xs font-bold transition-colors w-full justify-center flex items-center gap-1"
                            >
                              <X className="w-4 h-4"/> Cancelar
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              href={`/admin/preguntas/${sim.slug || ''}`}
                              className="px-3 py-2 text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-bold shadow-md"
                              title="Gestionar Preguntas"
                            >
                              <ListChecks className="w-4 h-4" /> Preguntas
                            </Link>

                            {sim.slug ? (
                              <Link
                                href={`/admin/resultados/${sim.slug}`}
                                className="p-2 text-gray-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors border border-gray-100 shadow-sm bg-white"
                                title="Analíticas"
                              >
                                <BarChart3 className="w-4 h-4" />
                              </Link>
                            ) : null}

                            <button
                              type="button"
                              onClick={() => iniciarEdicion(sim)}
                              disabled={actionLoading !== null}
                              className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-gray-100 shadow-sm bg-white"
                              title="Editar Metadatos"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>

                            <div className="relative group">
                              <button
                                type="button"
                                disabled={actionLoading !== null}
                                className="p-2 text-gray-500 hover:text-primary hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-1 border border-gray-100 shadow-sm bg-white"
                                title="Duplicar"
                              >
                                <Copy className="w-4 h-4" />
                              </button>
                              <div className="absolute right-0 top-full mt-1 hidden group-hover:block bg-white border border-gray-200 rounded-xl shadow-xl py-1 z-10 w-40">
                                <p className="text-[10px] text-gray-400 font-bold px-3 py-1 uppercase tracking-wider border-b border-gray-50 mb-1">Copiar a:</p>
                                {opciones.map((inst) => (
                                  <button
                                    key={inst}
                                    type="button"
                                    onClick={() => duplicarSimulador(sim, inst)}
                                    className="w-full text-left px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:text-primary transition-colors flex items-center gap-1.5"
                                  >
                                    <Move className="w-3 h-3 text-gray-400" /> {inst}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <button
                              type="button"
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

        <div className="px-4 py-3 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-xs font-semibold text-gray-500">
            {total === 0 ? '0 simuladores' : `Mostrando ${desde}–${hasta} de ${total}`}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={pagina <= 1}
              onClick={() => escribirUrl({ pagina: String(pagina - 1) })}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:pointer-events-none"
            >
              <ChevronLeft className="w-4 h-4" /> Anterior
            </button>
            <span className="text-xs font-bold text-gray-500 min-w-[4.5rem] text-center">
              {pagina} / {totalPaginas}
            </span>
            <button
              type="button"
              disabled={pagina >= totalPaginas}
              onClick={() => escribirUrl({ pagina: String(pagina + 1) })}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:pointer-events-none"
            >
              Siguiente <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
