'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useSupabase } from '../../../../components/AuthProvider';
import {
  AlertCircle, ArrowLeft, BookOpen, Check, CheckCircle, CheckSquare, ChevronDown,
  ChevronRight, Eye, FileText, Folder, FolderOpen, FolderPlus, Layers, Library,
  Loader2, Plus, Search, Trash2, Video, X, type LucideIcon,
} from 'lucide-react';
import {
  SELECT_LECCION_BANCO,
  type ContenidoModulo,
  type CursoResumen,
  type LeccionBanco,
  type ModuloConContenido,
} from './tipos';

interface Props {
  curso: CursoResumen;
  modulosIniciales: ModuloConContenido[];
  bancoLecciones: LeccionBanco[];
}

type Alerta = { type: 'success' | 'error'; text: string } | null;

/** Estilo visual según `banco_lecciones.tipo`; los tipos desconocidos usan el genérico. */
const TIPOS_LECCION: Record<string, { label: string; icon: LucideIcon; clases: string }> = {
  video: { label: 'Video', icon: Video, clases: 'text-blue-600 bg-blue-50 border-blue-100' },
  texto: { label: 'Lectura', icon: FileText, clases: 'text-amber-600 bg-amber-50 border-amber-100' },
  html: { label: 'Lectura', icon: FileText, clases: 'text-amber-600 bg-amber-50 border-amber-100' },
  simulador: { label: 'Simulador', icon: CheckSquare, clases: 'text-emerald-700 bg-emerald-50 border-emerald-100' },
};

const tipoInfo = (tipo: string | null) =>
  TIPOS_LECCION[(tipo || '').toLowerCase()] || {
    label: tipo || 'Lección',
    icon: BookOpen,
    clases: 'text-slate-600 bg-slate-50 border-slate-200',
  };

function BadgeTipo({ tipo }: { tipo: string | null }) {
  const { label, icon: Icon, clases } = tipoInfo(tipo);
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[11px] font-bold uppercase tracking-wider ${clases}`}>
      <Icon size={10} /> {label}
    </span>
  );
}

export default function ConstructorModulos({ curso, modulosIniciales, bancoLecciones }: Props) {
  const { supabase } = useSupabase();

  const [modulos, setModulos] = useState<ModuloConContenido[]>(modulosIniciales);
  const [colapsados, setColapsados] = useState<Set<string>>(new Set());
  const [alerta, setAlerta] = useState<Alerta>(null);

  // Creación de carpetas
  const [nuevoTitulo, setNuevoTitulo] = useState('');
  const [creando, setCreando] = useState(false);

  // Panel lateral del banco ("pinza")
  const [panelAbierto, setPanelAbierto] = useState(false);
  const [moduloDestinoId, setModuloDestinoId] = useState<string>('');
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set());
  const [busqueda, setBusqueda] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<string>('todos');
  const [agregando, setAgregando] = useState(false);

  const showAlert = (type: 'success' | 'error', text: string) => {
    setAlerta({ type, text });
    setTimeout(() => setAlerta(null), 4000);
  };

  // Cerrar el panel con Escape
  useEffect(() => {
    if (!panelAbierto) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && cerrarPanel();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [panelAbierto]);

  const moduloDestino = modulos.find((m) => m.id === moduloDestinoId) || null;

  /** Lecciones que ya están dentro de la carpeta destino (no se pueden volver a agregar). */
  const idsEnDestino = useMemo(
    () => new Set((moduloDestino?.contenido_modulos || []).map((c) => c.leccion_id).filter(Boolean) as string[]),
    [moduloDestino]
  );

  const tiposDisponibles = useMemo(
    () => Array.from(new Set(bancoLecciones.map((l) => (l.tipo || '').toLowerCase()).filter(Boolean))).sort(),
    [bancoLecciones]
  );

  const leccionesFiltradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return bancoLecciones.filter((l) => {
      const coincideTexto = !q || (l.titulo_interno || '').toLowerCase().includes(q);
      const coincideTipo = filtroTipo === 'todos' || (l.tipo || '').toLowerCase() === filtroTipo;
      return coincideTexto && coincideTipo;
    });
  }, [bancoLecciones, busqueda, filtroTipo]);

  const seleccionables = leccionesFiltradas.filter((l) => !idsEnDestino.has(l.id));
  const todasVisiblesSeleccionadas =
    seleccionables.length > 0 && seleccionables.every((l) => seleccion.has(l.id));

  const totalLecciones = modulos.reduce((acc, m) => acc + m.contenido_modulos.length, 0);

  // ─── Carpetas ──────────────────────────────────────────────────────────────

  const crearModulo = async (e: FormEvent) => {
    e.preventDefault();
    const titulo = nuevoTitulo.trim();
    if (!titulo) return showAlert('error', 'Escribe un nombre para la carpeta.');

    setCreando(true);
    const orden = modulos.reduce((max, m) => Math.max(max, m.orden), 0) + 1;
    const { data, error } = await supabase
      .from('modulos_curso')
      .insert([{ curso_id: curso.id, titulo, orden }])
      .select('id, titulo, orden, curso_id, created_at')
      .single();
    setCreando(false);

    if (error || !data) return showAlert('error', 'No se pudo crear la carpeta.');
    setModulos((prev) => [...prev, { ...(data as ModuloConContenido), contenido_modulos: [] }]);
    setNuevoTitulo('');
    showAlert('success', `Carpeta "${titulo}" creada.`);
  };

  const toggleColapso = (id: string) =>
    setColapsados((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const quitarContenido = async (modulo: ModuloConContenido, contenido: ContenidoModulo) => {
    const titulo = contenido.titulo_mostrar || contenido.banco_lecciones?.titulo_interno || 'esta lección';
    if (!confirm(`¿Quitar "${titulo}" de la carpeta "${modulo.titulo || ''}"? La lección seguirá en el banco.`)) return;

    const { error } = await supabase.from('contenido_modulos').delete().eq('id', contenido.id);
    if (error) return showAlert('error', 'No se pudo quitar la lección.');

    setModulos((prev) =>
      prev.map((m) =>
        m.id === modulo.id ? { ...m, contenido_modulos: m.contenido_modulos.filter((c) => c.id !== contenido.id) } : m
      )
    );
    showAlert('success', 'Lección quitada de la carpeta.');
  };

  // ─── Panel del banco ───────────────────────────────────────────────────────

  const abrirPanel = (moduloId?: string) => {
    setModuloDestinoId(moduloId || modulos[0]?.id || '');
    setSeleccion(new Set());
    setBusqueda('');
    setFiltroTipo('todos');
    setPanelAbierto(true);
  };

  function cerrarPanel() {
    setPanelAbierto(false);
    setSeleccion(new Set());
  }

  const cambiarDestino = (id: string) => {
    setModuloDestinoId(id);
    setSeleccion(new Set());
  };

  const toggleSeleccion = (id: string) =>
    setSeleccion((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const toggleTodasVisibles = () =>
    setSeleccion((prev) => {
      const next = new Set(prev);
      seleccionables.forEach((l) => (todasVisiblesSeleccionadas ? next.delete(l.id) : next.add(l.id)));
      return next;
    });

  const agregarSeleccion = async () => {
    if (!moduloDestino) return showAlert('error', 'Elige una carpeta de destino.');
    if (seleccion.size === 0) return;

    // Se respeta el orden en que aparecen en el banco y se colocan al final de la carpeta.
    const idsOrdenados = bancoLecciones.map((l) => l.id).filter((id) => seleccion.has(id) && !idsEnDestino.has(id));
    const ordenBase = moduloDestino.contenido_modulos.reduce((max, c) => Math.max(max, c.orden), 0);
    const filas = idsOrdenados.map((leccion_id, i) => ({
      modulo_id: moduloDestino.id,
      leccion_id,
      orden: ordenBase + i + 1,
      is_preview: false,
    }));

    setAgregando(true);
    const { data, error } = await supabase
      .from('contenido_modulos')
      .insert(filas)
      .select(`id, orden, titulo_mostrar, is_preview, leccion_id, modulo_id, banco_lecciones ( ${SELECT_LECCION_BANCO} )`);
    setAgregando(false);

    if (error || !data) return showAlert('error', 'No se pudieron agregar las lecciones.');

    const nuevos = (data as unknown as ContenidoModulo[]).sort((a, b) => a.orden - b.orden);
    setModulos((prev) =>
      prev.map((m) => (m.id === moduloDestino.id ? { ...m, contenido_modulos: [...m.contenido_modulos, ...nuevos] } : m))
    );
    setColapsados((prev) => {
      const next = new Set(prev);
      next.delete(moduloDestino.id);
      return next;
    });
    showAlert('success', `${nuevos.length} lección(es) agregada(s) a "${moduloDestino.titulo || ''}".`);
    cerrarPanel();
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-5xl mx-auto py-6 space-y-6">
      {alerta && (
        <div
          className={`fixed top-5 right-5 z-[60] p-4 rounded-xl shadow-xl flex items-center gap-3 font-semibold text-white ${
            alerta.type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'
          }`}
        >
          {alerta.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          {alerta.text}
        </div>
      )}

      {/* Cabecera */}
      <div className="bg-slate-900 p-6 rounded-2xl text-white shadow-lg">
        <Link
          href={`/admin/cursos/${curso.slug}`}
          className="text-slate-400 hover:text-white flex items-center gap-1 mb-3 text-sm font-medium transition-colors w-fit"
        >
          <ArrowLeft size={16} /> Volver al temario
        </Link>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-3">
              <Layers className="text-indigo-400 w-7 h-7" /> Constructor de Módulos
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              {curso.nombre || ''}
              {curso.institucion ? <span className="text-slate-500"> · {curso.institucion}</span> : null}
            </p>
          </div>
          <div className="flex gap-3 text-center">
            {[
              { label: 'Carpetas', valor: modulos.length },
              { label: 'Lecciones', valor: totalLecciones },
              { label: 'En el banco', valor: bancoLecciones.length },
            ].map((s) => (
              <div key={s.label} className="bg-slate-800 rounded-xl px-4 py-2 min-w-[90px]">
                <p className="text-xl font-bold text-white">{s.valor}</p>
                <p className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Crear carpeta */}
      <form
        onSubmit={crearModulo}
        className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col sm:flex-row gap-3"
      >
        <div className="relative flex-1">
          <FolderPlus className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            value={nuevoTitulo}
            onChange={(e) => setNuevoTitulo(e.target.value)}
            placeholder="Nombre de la nueva carpeta (Ej: Módulo 1 · Aritmética)"
            className="w-full pl-10 p-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition"
          />
        </div>
        <button
          type="submit"
          disabled={creando}
          className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white px-5 py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-md transition-all"
        >
          {creando ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />} Crear carpeta
        </button>
        <button
          type="button"
          onClick={() => abrirPanel()}
          disabled={modulos.length === 0}
          className="bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50 disabled:opacity-40 disabled:cursor-not-allowed px-5 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all"
        >
          <Library className="w-5 h-5" /> Banco de lecciones
        </button>
      </form>

      {/* Carpetas del curso */}
      {modulos.length === 0 ? (
        <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-12 text-center text-gray-400 flex flex-col items-center">
          <Folder className="w-12 h-12 mb-3 opacity-30" />
          <p className="font-semibold text-gray-500">Este curso aún no tiene carpetas.</p>
          <p className="text-sm mt-1">Crea la primera arriba y luego llénala con lecciones del banco.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {modulos.map((modulo, idx) => {
            const abierto = !colapsados.has(modulo.id);
            return (
              <section key={modulo.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <header className="flex items-center gap-3 p-4 bg-gray-50/70 border-b border-gray-100">
                  <button
                    onClick={() => toggleColapso(modulo.id)}
                    className="flex items-center gap-3 flex-1 min-w-0 text-left group"
                  >
                    {abierto ? (
                      <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
                    )}
                    <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                      {abierto ? <FolderOpen className="w-5 h-5" /> : <Folder className="w-5 h-5" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-500">Módulo {idx + 1}</p>
                      <h2 className="font-bold text-gray-800 truncate group-hover:text-indigo-700 transition-colors">
                        {modulo.titulo || 'Sin título'}
                      </h2>
                    </div>
                  </button>
                  <span className="hidden sm:inline text-xs font-bold bg-white border border-gray-200 text-gray-500 px-2.5 py-1 rounded-full">
                    {modulo.contenido_modulos.length} lecciones
                  </span>
                  <button
                    onClick={() => abrirPanel(modulo.id)}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-600 hover:text-white rounded-lg transition-colors border border-indigo-100"
                  >
                    <Plus className="w-4 h-4" /> Agregar lecciones
                  </button>
                </header>

                {abierto &&
                  (modulo.contenido_modulos.length === 0 ? (
                    <div className="p-6 text-center text-sm text-gray-400">
                      Carpeta vacía.{' '}
                      <button onClick={() => abrirPanel(modulo.id)} className="text-indigo-600 font-semibold hover:underline">
                        Toma lecciones del banco
                      </button>
                    </div>
                  ) : (
                    <ol className="divide-y divide-gray-100">
                      {modulo.contenido_modulos.map((contenido, i) => (
                        <li key={contenido.id} className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50 transition-colors group">
                          <span className="w-7 h-7 rounded-full bg-gray-100 text-gray-500 text-xs font-bold flex items-center justify-center shrink-0">
                            {i + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-800 truncate">
                              {contenido.titulo_mostrar || contenido.banco_lecciones?.titulo_interno || 'Lección sin título'}
                            </p>
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                              <BadgeTipo tipo={contenido.banco_lecciones?.tipo || null} />
                              {contenido.is_preview && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[11px] font-bold uppercase tracking-wider text-purple-600 bg-purple-50 border-purple-100">
                                  <Eye size={10} /> Vista previa
                                </span>
                              )}
                              {!contenido.banco_lecciones && (
                                <span className="text-[11px] font-semibold text-rose-500">Lección eliminada del banco</span>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => quitarContenido(modulo, contenido)}
                            title="Quitar de la carpeta"
                            className="p-2 text-gray-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </li>
                      ))}
                    </ol>
                  ))}
              </section>
            );
          })}
        </div>
      )}

      {/* Panel lateral: Banco de lecciones */}
      {panelAbierto && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[1px]" onClick={cerrarPanel} />

          <aside className="relative w-full max-w-xl h-full bg-white shadow-2xl flex flex-col">
            <div className="p-5 border-b border-gray-100 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <Library className="w-5 h-5 text-indigo-500" /> Banco de lecciones
                  </h2>
                  <p className="text-sm text-gray-500">Marca las lecciones que quieres meter en la carpeta.</p>
                </div>
                <button onClick={cerrarPanel} className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Carpeta destino</label>
                <div className="relative">
                  <FolderOpen className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-500 w-5 h-5" />
                  <select
                    value={moduloDestinoId}
                    onChange={(e) => cambiarDestino(e.target.value)}
                    className="w-full pl-10 p-2.5 border border-indigo-200 rounded-xl bg-indigo-50/50 font-semibold text-indigo-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    {modulos.map((m, i) => (
                      <option key={m.id} value={m.id}>
                        Módulo {i + 1} · {m.titulo || 'Sin título'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar por título interno..."
                  className="w-full pl-9 p-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {['todos', ...tiposDisponibles].map((tipo) => (
                  <button
                    key={tipo}
                    onClick={() => setFiltroTipo(tipo)}
                    className={`px-3 py-1 rounded-full text-xs font-bold border transition-colors ${
                      filtroTipo === tipo
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
                    }`}
                  >
                    {tipo === 'todos' ? 'Todos' : tipoInfo(tipo).label}
                  </button>
                ))}
                {seleccionables.length > 0 && (
                  <button onClick={toggleTodasVisibles} className="ml-auto text-xs font-bold text-indigo-600 hover:underline">
                    {todasVisiblesSeleccionadas ? 'Deseleccionar visibles' : 'Seleccionar visibles'}
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 bg-slate-50/60">
              {leccionesFiltradas.length === 0 ? (
                <div className="text-center text-gray-400 text-sm mt-12 flex flex-col items-center gap-2">
                  <BookOpen className="w-10 h-10 opacity-30" />
                  {bancoLecciones.length === 0 ? 'El banco de lecciones está vacío.' : 'Ninguna lección coincide con el filtro.'}
                </div>
              ) : (
                <ul className="space-y-2">
                  {leccionesFiltradas.map((leccion) => {
                    const yaEnCarpeta = idsEnDestino.has(leccion.id);
                    const marcada = yaEnCarpeta || seleccion.has(leccion.id);
                    return (
                      <li key={leccion.id}>
                        <label
                          className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                            yaEnCarpeta
                              ? 'bg-gray-100 border-gray-200 opacity-60 cursor-not-allowed'
                              : marcada
                              ? 'bg-indigo-50 border-indigo-300 ring-1 ring-indigo-200 cursor-pointer'
                              : 'bg-white border-gray-200 hover:border-indigo-200 cursor-pointer'
                          }`}
                        >
                          <input
                            type="checkbox"
                            className="sr-only"
                            checked={marcada}
                            disabled={yaEnCarpeta}
                            onChange={() => toggleSeleccion(leccion.id)}
                          />
                          <span
                            className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${
                              marcada ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-gray-300 bg-white'
                            }`}
                          >
                            {marcada && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-800 truncate">
                              {leccion.titulo_interno || 'Lección sin título'}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <BadgeTipo tipo={leccion.tipo} />
                              {yaEnCarpeta && <span className="text-[11px] font-semibold text-gray-500">Ya está en esta carpeta</span>}
                            </div>
                          </div>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="p-4 border-t border-gray-100 bg-white flex items-center gap-3">
              <p className="flex-1 text-sm text-gray-500">
                <span className="font-bold text-gray-800">{seleccion.size}</span> seleccionada(s)
              </p>
              <button onClick={cerrarPanel} className="px-4 py-2.5 rounded-xl font-bold text-gray-600 hover:bg-gray-100 transition-colors">
                Cancelar
              </button>
              <button
                onClick={agregarSeleccion}
                disabled={agregando || seleccion.size === 0 || !moduloDestino}
                className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 disabled:text-gray-500 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-md transition-all"
              >
                {agregando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Agregar a la carpeta
              </button>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
