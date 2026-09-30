'use client';

import { useMemo, useState } from 'react';
import { useSupabase } from '../../components/AuthProvider';
import {
  AlertCircle, CheckCircle, CheckSquare, Database, Edit3, FileText, FunctionSquare,
  Image as ImageIcon, Loader2, Paperclip, PlusCircle, Save, Search, Trash2, Type, Video, X,
  type LucideIcon,
} from 'lucide-react';
import type { Tables } from '@/types/supabase';

export type RecursoBanco = Tables<'banco_lecciones'> & {
  /** Número de carpetas (`contenido_modulos`) que usan este recurso. */
  usos: number;
};

export type SimuladorOpcion = Pick<Tables<'simuladores'>, 'id' | 'nombre' | 'institucion' | 'materia'>;

type TipoRecurso = 'video' | 'texto' | 'simulador';
type Alerta = { type: 'success' | 'error'; text: string } | null;

const TIPOS: Record<TipoRecurso, { label: string; descripcion: string; icon: LucideIcon; clases: string; activo: string }> = {
  video: {
    label: 'Video',
    descripcion: 'Clase en YouTube u otra URL',
    icon: Video,
    clases: 'text-blue-600 bg-blue-50 border-blue-100',
    activo: 'border-blue-500 bg-blue-50 ring-2 ring-blue-200',
  },
  texto: {
    label: 'Texto',
    descripcion: 'Teoría en Markdown / LaTeX',
    icon: FileText,
    clases: 'text-amber-600 bg-amber-50 border-amber-100',
    activo: 'border-amber-500 bg-amber-50 ring-2 ring-amber-200',
  },
  simulador: {
    label: 'Simulador',
    descripcion: 'Examen de tu banco de simuladores',
    icon: CheckSquare,
    clases: 'text-emerald-700 bg-emerald-50 border-emerald-100',
    activo: 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-200',
  },
};

const esTipoConocido = (tipo: string | null): tipo is TipoRecurso => (tipo || '') in TIPOS;

function BadgeTipo({ tipo }: { tipo: string | null }) {
  if (!esTipoConocido(tipo)) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[11px] font-bold uppercase tracking-wider text-slate-600 bg-slate-50 border-slate-200">
        {tipo || 'Sin tipo'}
      </span>
    );
  }
  const { label, icon: Icon, clases } = TIPOS[tipo];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[11px] font-bold uppercase tracking-wider ${clases}`}>
      <Icon size={10} /> {label}
    </span>
  );
}

const FORM_VACIO = {
  titulo_interno: '',
  tipo: 'video' as TipoRecurso,
  video_url: '',
  simulador_id: '',
  contenido_html: '',
  adjuntos: '',
};

/**
 * Valida `adjuntos` con el mismo formato que interpreta el aula virtual:
 * un JSON `[{ "titulo", "url" }]` o una URL por línea. Devuelve el nº de enlaces o un error.
 */
function validarAdjuntos(texto: string): { total: number; error?: string } {
  const valor = texto.trim();
  if (!valor) return { total: 0 };

  if (valor.startsWith('[') || valor.startsWith('{')) {
    try {
      const lista = JSON.parse(valor);
      if (!Array.isArray(lista)) return { total: 0, error: 'El JSON de adjuntos debe ser un arreglo: [{ "titulo": "...", "url": "..." }]' };
      const invalido = lista.find((a: any) => !/^https?:\/\//i.test(a?.url || ''));
      if (invalido) return { total: 0, error: 'Cada adjunto del JSON necesita una "url" que empiece con http(s)://' };
      return { total: lista.length };
    } catch {
      return { total: 0, error: 'El JSON de adjuntos no es válido.' };
    }
  }

  const lineas = valor.split('\n').map((l) => l.trim()).filter(Boolean);
  if (lineas.some((l) => !/^https?:\/\//i.test(l))) {
    return { total: 0, error: 'Cada línea de adjuntos debe ser una URL que empiece con http(s)://' };
  }
  return { total: lineas.length };
}

export default function BancoLeccionesCliente({
  recursosIniciales,
  simuladores,
}: {
  recursosIniciales: RecursoBanco[];
  simuladores: SimuladorOpcion[];
}) {
  const { supabase } = useSupabase();

  const [recursos, setRecursos] = useState<RecursoBanco[]>(recursosIniciales);
  const [alerta, setAlerta] = useState<Alerta>(null);

  // Formulario (crear / editar)
  const [formAbierto, setFormAbierto] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(FORM_VACIO);
  const [guardando, setGuardando] = useState(false);

  // Filtros de la tabla
  const [busqueda, setBusqueda] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<'todos' | TipoRecurso>('todos');

  const showAlert = (type: 'success' | 'error', text: string) => {
    setAlerta({ type, text });
    setTimeout(() => setAlerta(null), 4000);
  };

  const simuladoresPorId = useMemo(() => new Map(simuladores.map((s) => [s.id, s])), [simuladores]);

  const nombreSimulador = (id: string | null) => {
    const sim = id ? simuladoresPorId.get(id) : undefined;
    if (!sim) return id ? 'Simulador no disponible' : '';
    return `${sim.institucion ? `[${sim.institucion}] ` : ''}${sim.nombre || 'Sin nombre'}`;
  };

  const recursosFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return recursos.filter((r) => {
      const coincideTexto = !q || (r.titulo_interno || '').toLowerCase().includes(q);
      const coincideTipo = filtroTipo === 'todos' || (r.tipo || '') === filtroTipo;
      return coincideTexto && coincideTipo;
    });
  }, [recursos, busqueda, filtroTipo]);

  const conteoPorTipo = (tipo: TipoRecurso) => recursos.filter((r) => r.tipo === tipo).length;

  const estadoAdjuntos = validarAdjuntos(form.adjuntos);

  // ─── Formulario ────────────────────────────────────────────────────────────

  const actualizar = <K extends keyof typeof FORM_VACIO>(campo: K, valor: (typeof FORM_VACIO)[K]) =>
    setForm((prev) => ({ ...prev, [campo]: valor }));

  const resetForm = () => {
    setForm(FORM_VACIO);
    setEditingId(null);
    setFormAbierto(false);
  };

  const iniciarEdicion = (recurso: RecursoBanco) => {
    setEditingId(recurso.id);
    setForm({
      titulo_interno: recurso.titulo_interno || '',
      tipo: esTipoConocido(recurso.tipo) ? recurso.tipo : 'texto',
      video_url: recurso.video_url || '',
      simulador_id: recurso.simulador_id || '',
      contenido_html: recurso.contenido_html || '',
      adjuntos: recurso.adjuntos || '',
    });
    setFormAbierto(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  /** Valida según el tipo y descarta los campos que no le corresponden. */
  const construirPayload = () => {
    const titulo = form.titulo_interno.trim();
    const videoUrl = form.video_url.trim();
    const contenido = form.contenido_html.trim();

    if (!titulo) return { error: 'El título interno es obligatorio.' };
    if (form.tipo === 'video' && !videoUrl) return { error: 'Indica la URL del video.' };
    if (form.tipo === 'video' && !/^https?:\/\//i.test(videoUrl)) return { error: 'La URL del video debe empezar con http(s)://' };
    if (form.tipo === 'texto' && !contenido) return { error: 'El contenido del recurso de texto es obligatorio.' };
    if (form.tipo === 'simulador' && !form.simulador_id) return { error: 'Selecciona un simulador.' };

    const adjuntos = form.adjuntos.trim();
    const { error: errorAdjuntos } = validarAdjuntos(adjuntos);
    if (errorAdjuntos) return { error: errorAdjuntos };

    return {
      payload: {
        titulo_interno: titulo,
        tipo: form.tipo,
        video_url: form.tipo === 'video' ? videoUrl : null,
        simulador_id: form.tipo === 'simulador' ? form.simulador_id : null,
        contenido_html: contenido || null,
        adjuntos: adjuntos || null,
      },
    };
  };

  const guardarRecurso = async () => {
    const { payload, error: errorValidacion } = construirPayload();
    if (!payload) return showAlert('error', errorValidacion || 'Revisa el formulario.');

    setGuardando(true);
    const columnas = 'id, titulo_interno, tipo, video_url, simulador_id, contenido_html, adjuntos, created_at';

    if (editingId) {
      const { data, error } = await supabase
        .from('banco_lecciones')
        .update(payload)
        .eq('id', editingId)
        .select(columnas)
        .single();
      setGuardando(false);
      if (error || !data) return showAlert('error', 'No se pudo actualizar el recurso.');
      setRecursos((prev) => prev.map((r) => (r.id === editingId ? { ...(data as Tables<'banco_lecciones'>), usos: r.usos } : r)));
      showAlert('success', 'Recurso actualizado.');
    } else {
      const { data, error } = await supabase.from('banco_lecciones').insert([payload]).select(columnas).single();
      setGuardando(false);
      if (error || !data) return showAlert('error', 'No se pudo crear el recurso.');
      setRecursos((prev) => [{ ...(data as Tables<'banco_lecciones'>), usos: 0 }, ...prev]);
      showAlert('success', 'Recurso agregado al banco.');
    }
    resetForm();
  };

  const eliminarRecurso = async (recurso: RecursoBanco) => {
    const aviso =
      recurso.usos > 0
        ? `"${recurso.titulo_interno || ''}" está en ${recurso.usos} carpeta(s). Si lo eliminas, desaparecerá de esos cursos. ¿Continuar?`
        : `¿Eliminar permanentemente "${recurso.titulo_interno || ''}"?`;
    if (!confirm(aviso)) return;

    const { error } = await supabase.from('banco_lecciones').delete().eq('id', recurso.id);
    if (error) {
      // 23503 = violación de llave foránea (la FK de contenido_modulos no hace cascada)
      return showAlert(
        'error',
        error.code === '23503'
          ? 'Está en uso en carpetas de cursos. Quítalo primero desde el Constructor de Módulos.'
          : 'No se pudo eliminar el recurso.'
      );
    }
    setRecursos((prev) => prev.filter((r) => r.id !== recurso.id));
    if (editingId === recurso.id) resetForm();
    showAlert('success', 'Recurso eliminado.');
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-6xl mx-auto py-6 space-y-6">
      {alerta && (
        <div
          className={`fixed top-5 right-5 z-50 p-4 rounded-xl shadow-xl flex items-center gap-3 font-semibold text-white ${
            alerta.type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'
          }`}
        >
          {alerta.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          {alerta.text}
        </div>
      )}

      {/* Cabecera */}
      <div className="bg-slate-900 p-6 rounded-2xl text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <Database className="text-indigo-400 w-7 h-7" /> Banco de Lecciones
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Almacén central de recursos reutilizables. Luego asígnalos a las carpetas de cada curso.
          </p>
        </div>
        <button
          onClick={() => (formAbierto ? resetForm() : setFormAbierto(true))}
          className={`${
            formAbierto ? 'bg-slate-700 text-slate-200 hover:bg-slate-600' : 'bg-indigo-600 text-white hover:bg-indigo-500'
          } px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-md transition-all shrink-0`}
        >
          {formAbierto ? <><X className="w-5 h-5" /> Cancelar</> : <><PlusCircle className="w-5 h-5" /> Nuevo recurso</>}
        </button>
      </div>

      {/* Resumen por tipo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Total</p>
          <p className="text-2xl font-bold text-gray-800">{recursos.length}</p>
        </div>
        {(Object.keys(TIPOS) as TipoRecurso[]).map((tipo) => {
          const { label, icon: Icon, clases } = TIPOS[tipo];
          return (
            <div key={tipo} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${clases}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-gray-400">{label}</p>
                <p className="text-xl font-bold text-gray-800">{conteoPorTipo(tipo)}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Formulario crear / editar */}
      {formAbierto && (
        <div className="bg-indigo-50/50 p-6 rounded-2xl border border-indigo-100 shadow-inner">
          <h2 className="text-lg font-bold text-indigo-900 mb-6 flex items-center gap-2 border-b border-indigo-100 pb-3">
            {editingId ? <Edit3 className="w-5 h-5" /> : <PlusCircle className="w-5 h-5" />}
            {editingId ? 'Editando recurso' : 'Nuevo recurso'}
          </h2>

          <div className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-indigo-700 uppercase mb-1">Título interno *</label>
              <input
                type="text"
                value={form.titulo_interno}
                onChange={(e) => actualizar('titulo_interno', e.target.value)}
                placeholder="Ej: Ley de signos · Video explicativo"
                className="w-full p-3 border border-indigo-200 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
              />
              <p className="text-xs text-gray-500 mt-1">
                Solo lo ves tú. En cada curso puedes mostrarlo con otro nombre.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-indigo-700 uppercase mb-2">Tipo de recurso *</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {(Object.keys(TIPOS) as TipoRecurso[]).map((tipo) => {
                  const { label, descripcion, icon: Icon, clases, activo } = TIPOS[tipo];
                  const seleccionado = form.tipo === tipo;
                  return (
                    <button
                      key={tipo}
                      type="button"
                      onClick={() => actualizar('tipo', tipo)}
                      className={`flex items-center gap-3 p-4 rounded-xl border-2 text-left bg-white transition-all ${
                        seleccionado ? activo : 'border-gray-200 hover:border-indigo-200'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-lg border flex items-center justify-center shrink-0 ${clases}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-bold text-gray-800">{label}</p>
                        <p className="text-xs text-gray-500">{descripcion}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {form.tipo === 'video' && (
              <div>
                <label className="block text-xs font-bold text-indigo-700 uppercase mb-1">URL del video *</label>
                <div className="relative">
                  <Video className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
                  <input
                    type="url"
                    value={form.video_url}
                    onChange={(e) => actualizar('video_url', e.target.value)}
                    placeholder="https://youtube.com/watch?v=..."
                    className="w-full pl-10 p-3 border border-indigo-200 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-sm"
                  />
                </div>
              </div>
            )}

            {form.tipo === 'simulador' && (
              <div>
                <label className="block text-xs font-bold text-indigo-700 uppercase mb-1">Simulador *</label>
                <div className="relative">
                  <CheckSquare className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
                  <select
                    value={form.simulador_id}
                    onChange={(e) => actualizar('simulador_id', e.target.value)}
                    className="w-full pl-10 p-3 border border-indigo-200 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500 outline-none text-gray-700"
                  >
                    <option value="">-- Selecciona un simulador --</option>
                    {simuladores.map((sim) => (
                      <option key={sim.id} value={sim.id}>
                        [{sim.institucion || 'General'}] {sim.nombre || 'Sin nombre'}
                        {sim.materia ? ` · ${sim.materia}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                {simuladores.length === 0 && (
                  <p className="text-xs text-rose-500 mt-1">No hay simuladores activos. Crea uno primero.</p>
                )}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-indigo-700 uppercase mb-1">
                {form.tipo === 'texto' ? 'Contenido teórico *' : 'Apuntes / instrucciones (opcional)'}
              </label>
              <div className="bg-white border border-indigo-200 border-b-0 rounded-t-xl p-2 flex flex-wrap gap-4 text-xs font-medium text-gray-500">
                <span className="flex items-center gap-1"><Type size={14} /> **Negrita**</span>
                <span className="flex items-center gap-1"><ImageIcon size={14} /> ![alt](URL-Imagen)</span>
                <span className="flex items-center gap-1 text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                  <FunctionSquare size={14} /> \[ x^2 \] Ecuaciones
                </span>
              </div>
              <textarea
                value={form.contenido_html}
                onChange={(e) => actualizar('contenido_html', e.target.value)}
                rows={form.tipo === 'texto' ? 10 : 4}
                placeholder={form.tipo === 'texto' ? 'Escribe la teoría de esta lección...' : 'Notas que acompañan al recurso...'}
                className="w-full p-4 border border-indigo-200 rounded-b-xl bg-white focus:ring-2 focus:ring-indigo-500 outline-none resize-y font-mono text-sm"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-indigo-700 uppercase flex items-center gap-1">
                  <Paperclip size={14} /> Material Adjunto (URLs o JSON)
                </label>
                {estadoAdjuntos.error ? (
                  <span className="text-[11px] font-semibold text-rose-500">{estadoAdjuntos.error}</span>
                ) : estadoAdjuntos.total > 0 ? (
                  <span className="text-[11px] font-semibold text-emerald-600">{estadoAdjuntos.total} archivo(s) detectado(s)</span>
                ) : null}
              </div>
              <textarea
                value={form.adjuntos}
                onChange={(e) => actualizar('adjuntos', e.target.value)}
                rows={4}
                placeholder={'Una URL por línea:\nhttps://drive.google.com/...\n\nO JSON con títulos:\n[{ "titulo": "Diapositivas PDF", "url": "https://..." }]'}
                className={`w-full p-4 border rounded-xl bg-white focus:ring-2 outline-none resize-y font-mono text-sm ${
                  estadoAdjuntos.error ? 'border-rose-300 focus:ring-rose-400' : 'border-indigo-200 focus:ring-indigo-500'
                }`}
              />
              <p className="text-xs text-gray-500 mt-1">
                Opcional. Con URLs sueltas, el aula las muestra como &quot;Archivo Adjunto 1, 2...&quot;; usa JSON para ponerles nombre.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={resetForm}
              className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-6 py-3 rounded-xl font-bold transition-all"
            >
              Cancelar
            </button>
            <button
              onClick={guardarRecurso}
              disabled={guardando}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg transition-all"
            >
              {guardando ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              {editingId ? 'Actualizar recurso' : 'Guardar recurso'}
            </button>
          </div>
        </div>
      )}

      {/* Tabla de recursos */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row md:items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por título interno..."
              className="w-full pl-9 p-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {(['todos', ...Object.keys(TIPOS)] as ('todos' | TipoRecurso)[]).map((tipo) => (
              <button
                key={tipo}
                onClick={() => setFiltroTipo(tipo)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                  filtroTipo === tipo
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
                }`}
              >
                {tipo === 'todos' ? 'Todos' : TIPOS[tipo].label}
              </button>
            ))}
          </div>
        </div>

        {recursosFiltrados.length === 0 ? (
          <div className="p-12 text-center text-gray-400 flex flex-col items-center">
            <Database className="w-12 h-12 mb-3 opacity-20" />
            {recursos.length === 0 ? (
              <>
                <p className="font-semibold text-gray-500">El banco está vacío.</p>
                <p className="text-sm mt-1">Presiona &quot;Nuevo recurso&quot; para agregar el primero.</p>
              </>
            ) : (
              <p>Ningún recurso coincide con el filtro.</p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs font-bold uppercase tracking-wider text-gray-500">
                <tr>
                  <th className="p-4">Recurso</th>
                  <th className="p-4">Tipo</th>
                  <th className="p-4 text-center">En carpetas</th>
                  <th className="p-4">Creado</th>
                  <th className="p-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recursosFiltrados.map((recurso) => {
                  const detalle =
                    recurso.tipo === 'video'
                      ? recurso.video_url || ''
                      : recurso.tipo === 'simulador'
                      ? nombreSimulador(recurso.simulador_id)
                      : (recurso.contenido_html || '').slice(0, 90);
                  return (
                    <tr
                      key={recurso.id}
                      className={`hover:bg-gray-50 transition-colors ${editingId === recurso.id ? 'bg-indigo-50/60' : ''}`}
                    >
                      <td className="p-4 max-w-md">
                        <p className="font-bold text-gray-800 truncate">{recurso.titulo_interno || 'Sin título'}</p>
                        {detalle && <p className="text-xs text-gray-400 truncate mt-0.5 font-mono">{detalle}</p>}
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <BadgeTipo tipo={recurso.tipo} />
                          {validarAdjuntos(recurso.adjuntos || '').total > 0 && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[11px] font-bold text-purple-600 bg-purple-50 border-purple-100">
                              <Paperclip size={10} /> {validarAdjuntos(recurso.adjuntos || '').total}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <span
                          className={`inline-block min-w-[2rem] px-2 py-0.5 rounded-full text-xs font-bold ${
                            recurso.usos > 0 ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-400'
                          }`}
                        >
                          {recurso.usos}
                        </span>
                      </td>
                      <td className="p-4 text-gray-500 whitespace-nowrap">
                        {recurso.created_at ? new Date(recurso.created_at).toLocaleDateString('es-EC') : '—'}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => iniciarEdicion(recurso)}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors border border-indigo-100"
                          >
                            <Edit3 className="w-3.5 h-3.5" /> Editar
                          </button>
                          <button
                            onClick={() => eliminarRecurso(recurso)}
                            title="Eliminar"
                            className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-100"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
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
