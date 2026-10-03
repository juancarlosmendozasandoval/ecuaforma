'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useSupabase } from '../../../../components/AuthProvider';
import {
  AlertCircle, AlertTriangle, ArrowDown, ArrowLeft, ArrowUp, BookOpen, Check, CheckCircle, CheckSquare,
  ChevronDown, ChevronRight, Eye, FileText, Folder, FolderOpen, FolderPlus, FolderTree, Layers, Library,
  Loader2, Pencil, Plus, Search, Trash2, Video, X, type LucideIcon,
} from 'lucide-react';
import { crearCarpeta, editarCarpeta, eliminarCarpeta, moverCarpeta } from './acciones';
import {
  SELECT_LECCION_BANCO,
  armarArbolModulos,
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
type TipoCarpeta = 'principal' | 'submodulo';
type Dialogo = { tipo: 'editar' | 'eliminar'; modulo: ModuloConContenido } | null;

/** Subir, bajar, renombrar y eliminar una carpeta; las flechas se limitan a sus hermanos. */
function AccionesCarpeta({
  esPrimero,
  esUltimo,
  ocupado,
  onMover,
  onEditar,
  onEliminar,
}: {
  esPrimero: boolean;
  esUltimo: boolean;
  ocupado: boolean;
  onMover: (direccion: 'arriba' | 'abajo') => void;
  onEditar: () => void;
  onEliminar: () => void;
}) {
  const base = 'p-1.5 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed';
  return (
    <div className="flex items-center shrink-0">
      {ocupado ? (
        <span className="p-1.5">
          <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
        </span>
      ) : (
        <>
          <button onClick={() => onMover('arriba')} disabled={esPrimero} title="Subir" aria-label="Subir"
            className={`${base} text-gray-400 hover:text-indigo-600 hover:bg-indigo-50`}>
            <ArrowUp className="w-4 h-4" />
          </button>
          <button onClick={() => onMover('abajo')} disabled={esUltimo} title="Bajar" aria-label="Bajar"
            className={`${base} text-gray-400 hover:text-indigo-600 hover:bg-indigo-50`}>
            <ArrowDown className="w-4 h-4" />
          </button>
        </>
      )}
      <button onClick={onEditar} title="Renombrar" aria-label="Renombrar"
        className={`${base} text-gray-400 hover:text-indigo-600 hover:bg-indigo-50`}>
        <Pencil className="w-4 h-4" />
      </button>
      <button onClick={onEliminar} title="Eliminar" aria-label="Eliminar"
        className={`${base} text-gray-400 hover:text-rose-600 hover:bg-rose-50`}>
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}

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

function ListaLecciones({
  contenido,
  onQuitar,
}: {
  contenido: ContenidoModulo[];
  onQuitar: (contenido: ContenidoModulo) => void;
}) {
  return (
    <ol className="divide-y divide-gray-100">
      {contenido.map((item, i) => (
        <li key={item.id} className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50 transition-colors group">
          <span className="w-7 h-7 rounded-full bg-gray-100 text-gray-500 text-xs font-bold flex items-center justify-center shrink-0">
            {i + 1}
          </span>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-800 truncate">
              {item.titulo_mostrar || item.banco_lecciones?.titulo_interno || 'Lección sin título'}
            </p>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <BadgeTipo tipo={item.banco_lecciones?.tipo || null} />
              {item.is_preview && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[11px] font-bold uppercase tracking-wider text-purple-600 bg-purple-50 border-purple-100">
                  <Eye size={10} /> Vista previa
                </span>
              )}
              {!item.banco_lecciones && (
                <span className="text-[11px] font-semibold text-rose-500">Lección eliminada del banco</span>
              )}
            </div>
          </div>
          <button
            onClick={() => onQuitar(item)}
            title="Quitar de la carpeta"
            className="p-2 text-gray-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </li>
      ))}
    </ol>
  );
}

export default function ConstructorModulos({ curso, modulosIniciales, bancoLecciones }: Props) {
  const { supabase } = useSupabase();

  /** Lista plana de carpetas de ambos niveles; el árbol se deriva con `armarArbolModulos`. */
  const [modulos, setModulos] = useState<ModuloConContenido[]>(modulosIniciales);
  const [colapsados, setColapsados] = useState<Set<string>>(new Set());
  const [alerta, setAlerta] = useState<Alerta>(null);

  // Modal de creación de carpetas
  const [modalAbierto, setModalAbierto] = useState(false);
  const [tipoNueva, setTipoNueva] = useState<TipoCarpeta>('principal');
  const [nuevoTitulo, setNuevoTitulo] = useState('');
  const [padreNuevaId, setPadreNuevaId] = useState('');
  const [creando, setCreando] = useState(false);

  // Edición, eliminación y reordenamiento de carpetas
  const [dialogo, setDialogo] = useState<Dialogo>(null);
  const [tituloEdicion, setTituloEdicion] = useState('');
  const [procesando, setProcesando] = useState(false);
  const [moviendoId, setMoviendoId] = useState<string | null>(null);

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

  // Cerrar el panel o el modal con Escape
  useEffect(() => {
    if (!panelAbierto && !modalAbierto && !dialogo) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (dialogo) setDialogo(null);
      else if (modalAbierto) setModalAbierto(false);
      else cerrarPanel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [panelAbierto, modalAbierto, dialogo]);

  const arbol = useMemo(() => armarArbolModulos(modulos), [modulos]);
  const totalSubmodulos = arbol.reduce((acc, raiz) => acc + raiz.submodulos.length, 0);
  const totalLecciones = modulos.reduce((acc, m) => acc + m.contenido_modulos.length, 0);

  /** Solo los submódulos admiten lecciones. */
  const moduloDestino = useMemo(
    () => arbol.flatMap((raiz) => raiz.submodulos).find((sub) => sub.id === moduloDestinoId) || null,
    [arbol, moduloDestinoId]
  );

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

  // ─── Carpetas ──────────────────────────────────────────────────────────────

  const abrirModal = (padreId?: string) => {
    const tipo: TipoCarpeta = padreId ? 'submodulo' : 'principal';
    setTipoNueva(tipo);
    setPadreNuevaId(padreId || arbol[0]?.id || '');
    setNuevoTitulo('');
    setModalAbierto(true);
  };

  const enviarCarpeta = async (e: FormEvent) => {
    e.preventDefault();
    const titulo = nuevoTitulo.trim();
    if (!titulo) return showAlert('error', 'Escribe un nombre para la carpeta.');

    const parentId = tipoNueva === 'submodulo' ? padreNuevaId : null;
    if (tipoNueva === 'submodulo' && !parentId) return showAlert('error', 'Elige el módulo principal.');

    setCreando(true);
    const resultado = await crearCarpeta({ cursoId: curso.id, titulo, parentId });
    setCreando(false);

    if (!resultado.ok) return showAlert('error', resultado.mensaje);

    setModulos((prev) => [...prev, { ...resultado.modulo, contenido_modulos: [] }]);
    if (parentId) {
      setColapsados((prev) => {
        const next = new Set(prev);
        next.delete(parentId);
        return next;
      });
    }
    setModalAbierto(false);
    showAlert('success', `${parentId ? 'Submódulo' : 'Módulo'} "${titulo}" creado.`);
  };

  const abrirEdicion = (modulo: ModuloConContenido) => {
    setTituloEdicion(modulo.titulo || '');
    setDialogo({ tipo: 'editar', modulo });
  };

  const guardarEdicion = async (e: FormEvent) => {
    e.preventDefault();
    if (!dialogo) return;
    const titulo = tituloEdicion.trim();
    if (!titulo) return showAlert('error', 'Escribe un nombre para la carpeta.');

    setProcesando(true);
    const resultado = await editarCarpeta(dialogo.modulo.id, titulo);
    setProcesando(false);
    if (!resultado.ok) return showAlert('error', resultado.mensaje);

    setModulos((prev) => prev.map((m) => (m.id === dialogo.modulo.id ? { ...m, titulo: resultado.titulo } : m)));
    setDialogo(null);
    showAlert('success', 'Carpeta renombrada.');
  };

  const confirmarEliminacion = async () => {
    if (!dialogo) return;
    const { modulo } = dialogo;

    setProcesando(true);
    const resultado = await eliminarCarpeta(modulo.id);
    setProcesando(false);
    if (!resultado.ok) return showAlert('error', resultado.mensaje);

    setModulos((prev) => prev.filter((m) => m.id !== modulo.id));
    if (moduloDestinoId === modulo.id) setModuloDestinoId('');
    setDialogo(null);
    showAlert('success', `"${modulo.titulo || ''}" eliminada.`);
  };

  const mover = async (modulo: ModuloConContenido, direccion: 'arriba' | 'abajo') => {
    if (moviendoId) return;
    setMoviendoId(modulo.id);
    const resultado = await moverCarpeta(modulo.id, direccion);
    setMoviendoId(null);
    if (!resultado.ok) return showAlert('error', resultado.mensaje);

    const nuevos = new Map(resultado.ordenes.map((o) => [o.id, o.orden]));
    setModulos((prev) => prev.map((m) => (nuevos.has(m.id) ? { ...m, orden: nuevos.get(m.id)! } : m)));
  };

  /** Motivo por el que una carpeta no se puede borrar todavía (el servidor vuelve a comprobarlo). */
  const bloqueoEliminacion = (modulo: ModuloConContenido) => {
    const subs = modulos.filter((m) => m.parent_id === modulo.id).length;
    if (subs > 0) return `Tiene ${subs} submódulo(s). Elimínalos antes de borrar este módulo.`;
    const lecciones = modulo.contenido_modulos.length;
    if (lecciones > 0) return `Tiene ${lecciones} lección(es). Quítalas antes de borrar esta carpeta.`;
    return '';
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

  const abrirPanel = (submoduloId?: string) => {
    setModuloDestinoId(submoduloId || arbol.find((raiz) => raiz.submodulos.length > 0)?.submodulos[0]?.id || '');
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
    if (!moduloDestino) return showAlert('error', 'Elige un submódulo de destino.');
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
      if (moduloDestino.parent_id) next.delete(moduloDestino.parent_id);
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
          className={`fixed top-5 right-5 z-[70] p-4 rounded-xl shadow-xl flex items-center gap-3 font-semibold text-white ${
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
          <div className="flex flex-wrap gap-3 text-center">
            {[
              { label: 'Módulos', valor: arbol.length },
              { label: 'Submódulos', valor: totalSubmodulos },
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

      {/* Acciones */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col sm:flex-row sm:items-center gap-3">
        <p className="flex-1 text-sm text-gray-500 flex items-center gap-2">
          <FolderTree className="w-5 h-5 text-indigo-400 shrink-0" />
          Organiza el curso en módulos principales y submódulos; las lecciones van dentro de los submódulos.
        </p>
        <button
          onClick={() => abrirModal()}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-md transition-all"
        >
          <FolderPlus className="w-5 h-5" /> Nueva carpeta
        </button>
        <button
          onClick={() => abrirPanel()}
          disabled={totalSubmodulos === 0}
          title={totalSubmodulos === 0 ? 'Crea primero un submódulo' : undefined}
          className="bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50 disabled:opacity-40 disabled:cursor-not-allowed px-5 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all"
        >
          <Library className="w-5 h-5" /> Banco de lecciones
        </button>
      </div>

      {/* Árbol de carpetas del curso */}
      {arbol.length === 0 ? (
        <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-12 text-center text-gray-400 flex flex-col items-center">
          <Folder className="w-12 h-12 mb-3 opacity-30" />
          <p className="font-semibold text-gray-500">Este curso aún no tiene módulos.</p>
          <p className="text-sm mt-1">Crea un módulo principal (Ej: Física), luego sus submódulos (Ej: Cinemática) y llénalos con lecciones.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {arbol.map((raiz, idx) => {
            const abierto = !colapsados.has(raiz.id);
            const leccionesRaiz = raiz.submodulos.reduce((acc, s) => acc + s.contenido_modulos.length, raiz.contenido_modulos.length);

            return (
              <section key={raiz.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <header className="flex items-center gap-3 p-4 bg-gray-50/70 border-b border-gray-100">
                  <button
                    onClick={() => toggleColapso(raiz.id)}
                    aria-expanded={abierto}
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
                        {raiz.titulo || 'Sin título'}
                      </h2>
                    </div>
                  </button>
                  <span className="hidden sm:inline text-xs font-bold bg-white border border-gray-200 text-gray-500 px-2.5 py-1 rounded-full">
                    {raiz.submodulos.length} submódulos · {leccionesRaiz} lecciones
                  </span>
                  <AccionesCarpeta
                    esPrimero={idx === 0}
                    esUltimo={idx === arbol.length - 1}
                    ocupado={moviendoId === raiz.id}
                    onMover={(direccion) => mover(raiz, direccion)}
                    onEditar={() => abrirEdicion(raiz)}
                    onEliminar={() => setDialogo({ tipo: 'eliminar', modulo: raiz })}
                  />
                  <button
                    onClick={() => abrirModal(raiz.id)}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-600 bg-white hover:bg-slate-800 hover:text-white rounded-lg transition-colors border border-gray-200"
                  >
                    <FolderPlus className="w-4 h-4" /> Submódulo
                  </button>
                </header>

                {abierto && (
                  <div className="p-3 sm:p-4 space-y-3 bg-slate-50/40">
                    {raiz.contenido_modulos.length > 0 && (
                      <div className="rounded-xl border border-amber-200 bg-amber-50/60 overflow-hidden">
                        <p className="px-4 py-2.5 text-xs font-semibold text-amber-800 flex items-start gap-2 border-b border-amber-200">
                          <AlertTriangle className="w-4 h-4 shrink-0 mt-px" />
                          Estas lecciones están directamente en el módulo principal. Agrégalas a un submódulo y quítalas de aquí.
                        </p>
                        <div className="bg-white">
                          <ListaLecciones contenido={raiz.contenido_modulos} onQuitar={(c) => quitarContenido(raiz, c)} />
                        </div>
                      </div>
                    )}

                    {raiz.submodulos.length === 0 ? (
                      <div className="p-6 text-center text-sm text-gray-400 rounded-xl border-2 border-dashed border-gray-200 bg-white">
                        Este módulo aún no tiene submódulos.{' '}
                        <button onClick={() => abrirModal(raiz.id)} className="text-indigo-600 font-semibold hover:underline">
                          Crea el primero
                        </button>
                      </div>
                    ) : (
                      raiz.submodulos.map((sub, idxSub) => {
                        const subAbierto = !colapsados.has(sub.id);
                        return (
                          <div key={sub.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                            <div className="flex items-center gap-3 px-3 py-2.5 border-b border-gray-100">
                              <button
                                onClick={() => toggleColapso(sub.id)}
                                aria-expanded={subAbierto}
                                className="flex items-center gap-2.5 flex-1 min-w-0 text-left group"
                              >
                                {subAbierto ? (
                                  <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
                                ) : (
                                  <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
                                )}
                                <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
                                  {subAbierto ? <FolderOpen className="w-4 h-4" /> : <Folder className="w-4 h-4" />}
                                </div>
                                <span className="text-[11px] font-bold text-sky-600 shrink-0">
                                  {idx + 1}.{idxSub + 1}
                                </span>
                                <h3 className="font-semibold text-gray-800 truncate group-hover:text-indigo-700 transition-colors">
                                  {sub.titulo || 'Sin título'}
                                </h3>
                              </button>
                              <span className="hidden sm:inline text-[11px] font-bold text-gray-400">
                                {sub.contenido_modulos.length} lecciones
                              </span>
                              <AccionesCarpeta
                                esPrimero={idxSub === 0}
                                esUltimo={idxSub === raiz.submodulos.length - 1}
                                ocupado={moviendoId === sub.id}
                                onMover={(direccion) => mover(sub, direccion)}
                                onEditar={() => abrirEdicion(sub)}
                                onEliminar={() => setDialogo({ tipo: 'eliminar', modulo: sub })}
                              />
                              <button
                                onClick={() => abrirPanel(sub.id)}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-600 hover:text-white rounded-lg transition-colors border border-indigo-100"
                              >
                                <Plus className="w-4 h-4" /> Agregar lecciones
                              </button>
                            </div>

                            {subAbierto &&
                              (sub.contenido_modulos.length === 0 ? (
                                <div className="p-5 text-center text-sm text-gray-400">
                                  Submódulo vacío.{' '}
                                  <button onClick={() => abrirPanel(sub.id)} className="text-indigo-600 font-semibold hover:underline">
                                    Toma lecciones del banco
                                  </button>
                                </div>
                              ) : (
                                <ListaLecciones contenido={sub.contenido_modulos} onQuitar={(c) => quitarContenido(sub, c)} />
                              ))}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}

      {/* Modal: nueva carpeta */}
      {modalAbierto && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-[1px]" onClick={() => setModalAbierto(false)} />

          <form
            onSubmit={enviarCarpeta}
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-modal-carpeta"
            className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4 p-5 border-b border-gray-100">
              <div>
                <h2 id="titulo-modal-carpeta" className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  <FolderPlus className="w-5 h-5 text-indigo-500" /> Nueva carpeta
                </h2>
                <p className="text-sm text-gray-500">Ej: Física (módulo) → Cinemática (submódulo) → MRU (lección).</p>
              </div>
              <button
                type="button"
                onClick={() => setModalAbierto(false)}
                className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <fieldset>
                <legend className="block text-xs font-bold text-gray-500 uppercase mb-2">Tipo de carpeta</legend>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { valor: 'principal', titulo: 'Módulo principal', detalle: 'Agrupa submódulos', icon: Folder },
                    { valor: 'submodulo', titulo: 'Submódulo', detalle: 'Contiene lecciones', icon: FolderOpen },
                  ] as const).map((opcion) => {
                    const activo = tipoNueva === opcion.valor;
                    const deshabilitado = opcion.valor === 'submodulo' && arbol.length === 0;
                    return (
                      <label
                        key={opcion.valor}
                        className={`flex items-start gap-2.5 p-3 rounded-xl border-2 transition-colors ${
                          deshabilitado
                            ? 'opacity-40 cursor-not-allowed border-gray-200'
                            : activo
                            ? 'border-indigo-500 bg-indigo-50 cursor-pointer'
                            : 'border-gray-200 hover:border-indigo-200 cursor-pointer'
                        }`}
                      >
                        <input
                          type="radio"
                          name="tipo-carpeta"
                          className="sr-only"
                          value={opcion.valor}
                          checked={activo}
                          disabled={deshabilitado}
                          onChange={() => setTipoNueva(opcion.valor)}
                        />
                        <opcion.icon className={`w-5 h-5 shrink-0 ${activo ? 'text-indigo-600' : 'text-gray-400'}`} />
                        <span>
                          <span className="block text-sm font-bold text-gray-800">{opcion.titulo}</span>
                          <span className="block text-[11px] text-gray-500">{opcion.detalle}</span>
                        </span>
                      </label>
                    );
                  })}
                </div>
                {arbol.length === 0 && (
                  <p className="text-[11px] text-gray-400 mt-2">Crea primero un módulo principal para poder añadirle submódulos.</p>
                )}
              </fieldset>

              {tipoNueva === 'submodulo' && (
                <div>
                  <label htmlFor="padre-carpeta" className="block text-xs font-bold text-gray-500 uppercase mb-1">
                    Módulo principal
                  </label>
                  <select
                    id="padre-carpeta"
                    value={padreNuevaId}
                    onChange={(e) => setPadreNuevaId(e.target.value)}
                    className="w-full p-2.5 border border-gray-200 rounded-xl bg-gray-50 font-semibold text-gray-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    {arbol.map((raiz, i) => (
                      <option key={raiz.id} value={raiz.id}>
                        Módulo {i + 1} · {raiz.titulo || 'Sin título'}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label htmlFor="titulo-carpeta" className="block text-xs font-bold text-gray-500 uppercase mb-1">
                  Nombre
                </label>
                <input
                  id="titulo-carpeta"
                  type="text"
                  autoFocus
                  maxLength={150}
                  value={nuevoTitulo}
                  onChange={(e) => setNuevoTitulo(e.target.value)}
                  placeholder={tipoNueva === 'principal' ? 'Ej: Física' : 'Ej: Cinemática'}
                  className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition"
                />
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setModalAbierto(false)}
                className="px-4 py-2.5 rounded-xl font-bold text-gray-600 hover:bg-gray-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={creando || !nuevoTitulo.trim() || (tipoNueva === 'submodulo' && !padreNuevaId)}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-md transition-all"
              >
                {creando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {tipoNueva === 'principal' ? 'Crear módulo' : 'Crear submódulo'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Diálogo: renombrar o eliminar carpeta */}
      {dialogo && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-[1px]" onClick={() => !procesando && setDialogo(null)} />

          {dialogo.tipo === 'editar' ? (
            <form
              onSubmit={guardarEdicion}
              role="dialog"
              aria-modal="true"
              aria-labelledby="titulo-dialogo-carpeta"
              className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl"
            >
              <div className="p-5 border-b border-gray-100">
                <h2 id="titulo-dialogo-carpeta" className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  <Pencil className="w-5 h-5 text-indigo-500" />
                  Renombrar {dialogo.modulo.parent_id ? 'submódulo' : 'módulo'}
                </h2>
              </div>
              <div className="p-5">
                <label htmlFor="titulo-edicion" className="block text-xs font-bold text-gray-500 uppercase mb-1">
                  Nombre
                </label>
                <input
                  id="titulo-edicion"
                  type="text"
                  autoFocus
                  maxLength={150}
                  value={tituloEdicion}
                  onChange={(e) => setTituloEdicion(e.target.value)}
                  className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition"
                />
              </div>
              <div className="p-4 border-t border-gray-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setDialogo(null)}
                  className="px-4 py-2.5 rounded-xl font-bold text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={procesando || !tituloEdicion.trim() || tituloEdicion.trim() === (dialogo.modulo.titulo || '')}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-md transition-all"
                >
                  {procesando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Guardar
                </button>
              </div>
            </form>
          ) : (
            (() => {
              const bloqueo = bloqueoEliminacion(dialogo.modulo);
              return (
                <div
                  role="alertdialog"
                  aria-modal="true"
                  aria-labelledby="titulo-dialogo-carpeta"
                  className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl"
                >
                  <div className="p-5 flex gap-4">
                    <span
                      className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                        bloqueo ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600'
                      }`}
                    >
                      {bloqueo ? <AlertTriangle className="w-5 h-5" /> : <Trash2 className="w-5 h-5" />}
                    </span>
                    <div className="min-w-0">
                      <h2 id="titulo-dialogo-carpeta" className="text-lg font-bold text-gray-800">
                        Eliminar {dialogo.modulo.parent_id ? 'submódulo' : 'módulo'}
                      </h2>
                      <p className="text-sm text-gray-600 mt-1 break-words">
                        <span className="font-semibold">&quot;{dialogo.modulo.titulo || 'Sin título'}&quot;</span>
                        {bloqueo ? ' no se puede eliminar todavía.' : ' se eliminará de forma permanente.'}
                      </p>
                      {bloqueo && <p className="text-sm text-amber-700 mt-2">{bloqueo}</p>}
                    </div>
                  </div>
                  <div className="p-4 border-t border-gray-100 flex justify-end gap-3">
                    <button
                      onClick={() => setDialogo(null)}
                      className="px-4 py-2.5 rounded-xl font-bold text-gray-600 hover:bg-gray-100 transition-colors"
                    >
                      {bloqueo ? 'Entendido' : 'Cancelar'}
                    </button>
                    {!bloqueo && (
                      <button
                        onClick={confirmarEliminacion}
                        disabled={procesando}
                        className="bg-rose-600 hover:bg-rose-700 disabled:bg-rose-300 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-md transition-all"
                      >
                        {procesando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        Eliminar
                      </button>
                    )}
                  </div>
                </div>
              );
            })()
          )}
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
                  <p className="text-sm text-gray-500">Marca las lecciones que quieres meter en el submódulo.</p>
                </div>
                <button onClick={cerrarPanel} className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Submódulo destino</label>
                <div className="relative">
                  <FolderOpen className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-500 w-5 h-5" />
                  <select
                    value={moduloDestinoId}
                    onChange={(e) => cambiarDestino(e.target.value)}
                    className="w-full pl-10 p-2.5 border border-indigo-200 rounded-xl bg-indigo-50/50 font-semibold text-indigo-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    {arbol
                      .filter((raiz) => raiz.submodulos.length > 0)
                      .map((raiz) => {
                        const numero = arbol.indexOf(raiz) + 1;
                        return (
                          <optgroup key={raiz.id} label={`Módulo ${numero} · ${raiz.titulo || 'Sin título'}`}>
                            {raiz.submodulos.map((sub, i) => (
                              <option key={sub.id} value={sub.id}>
                                {numero}.{i + 1} · {sub.titulo || 'Sin título'}
                              </option>
                            ))}
                          </optgroup>
                        );
                      })}
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
                              {yaEnCarpeta && <span className="text-[11px] font-semibold text-gray-500">Ya está en este submódulo</span>}
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
                Agregar al submódulo
              </button>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
