'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSupabase } from '../../components/AuthProvider';
import {
  AlertCircle, CheckCircle, Edit3, FolderTree, Loader2, PlusCircle, Save, Tags, Trash2, X,
} from 'lucide-react';
import type { Materia, Tema } from '@/types/biblioteca';

type Alerta = { type: 'success' | 'error'; text: string } | null;

type FormMateria = {
  id: string | null;
  nombre: string;
  slug: string;
  descripcion: string;
  orden: string;
};

type FormTema = {
  id: string | null;
  materia_id: string;
  nombre: string;
  slug: string;
  orden: string;
};

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** Minúsculas, sin acentos, separado por guiones. Cumple el check de la base de datos. */
function slugificar(texto: string) {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const siguienteOrden = (filas: { orden: number }[]) =>
  filas.length === 0 ? 0 : Math.max(...filas.map((fila) => fila.orden || 0)) + 1;

const formMateriaVacio = (orden: number): FormMateria => ({
  id: null,
  nombre: '',
  slug: '',
  descripcion: '',
  orden: String(orden),
});

const formTemaVacio = (orden: number, materiaId = ''): FormTema => ({
  id: null,
  materia_id: materiaId,
  nombre: '',
  slug: '',
  orden: String(orden),
});

function leerOrden(valor: string) {
  const orden = Number(valor);
  if (!Number.isInteger(orden) || orden < 0) return null;
  return orden;
}

export default function CategoriasCliente({
  materiasIniciales,
  temasIniciales,
}: {
  materiasIniciales: Materia[];
  temasIniciales: Tema[];
}) {
  const { supabase } = useSupabase();
  const router = useRouter();

  const [materias, setMaterias] = useState(materiasIniciales);
  const [temas, setTemas] = useState(temasIniciales);
  const [alerta, setAlerta] = useState<Alerta>(null);

  const [formMateria, setFormMateria] = useState<FormMateria | null>(null);
  const [slugMateriaManual, setSlugMateriaManual] = useState(false);
  const [guardandoMateria, setGuardandoMateria] = useState(false);

  const [formTema, setFormTema] = useState<FormTema | null>(null);
  const [slugTemaManual, setSlugTemaManual] = useState(false);
  const [guardandoTema, setGuardandoTema] = useState(false);

  const claveMaterias = materiasIniciales.map((m) => [m.id, m.nombre, m.slug, m.orden, m.descripcion].join('\u0001')).join('\u0002');
  const claveTemas = temasIniciales.map((t) => [t.id, t.materia_id, t.nombre, t.slug, t.orden].join('\u0001')).join('\u0002');

  useEffect(() => {
    setMaterias(materiasIniciales);
    // La clave cambia solo cuando el servidor devuelve otro catálogo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claveMaterias]);

  useEffect(() => {
    setTemas(temasIniciales);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claveTemas]);

  const showAlert = (type: 'success' | 'error', text: string) => {
    setAlerta({ type, text });
    setTimeout(() => setAlerta(null), 4000);
  };

  const materiasPorId = useMemo(() => new Map(materias.map((materia) => [materia.id, materia])), [materias]);
  const temasPorMateria = useMemo(() => {
    const conteo = new Map<string, number>();
    for (const tema of temas) conteo.set(tema.materia_id, (conteo.get(tema.materia_id) || 0) + 1);
    return conteo;
  }, [temas]);

  const abrirNuevaMateria = () => {
    setSlugMateriaManual(false);
    setFormMateria(formMateriaVacio(siguienteOrden(materias)));
  };

  const editarMateria = (materia: Materia) => {
    setSlugMateriaManual(true);
    setFormMateria({
      id: materia.id,
      nombre: materia.nombre || '',
      slug: materia.slug || '',
      descripcion: materia.descripcion || '',
      orden: String(materia.orden ?? 0),
    });
  };

  const cambiarNombreMateria = (nombre: string) => {
    setFormMateria((prev) =>
      prev
        ? { ...prev, nombre, slug: slugMateriaManual ? prev.slug : slugificar(nombre) }
        : prev
    );
  };

  const guardarMateria = async () => {
    if (!formMateria) return;
    const nombre = formMateria.nombre.trim();
    const slug = slugificar(formMateria.slug || nombre);
    const orden = leerOrden(formMateria.orden);
    const descripcion = formMateria.descripcion.trim();

    if (!nombre) return showAlert('error', 'El nombre de la materia es obligatorio.');
    if (!slug || !SLUG.test(slug)) return showAlert('error', 'El slug solo puede tener minúsculas, números y guiones.');
    if (orden === null) return showAlert('error', 'El orden debe ser un número entero mayor o igual a 0.');

    const payload = { nombre, slug, descripcion: descripcion || null, orden };
    setGuardandoMateria(true);

    if (formMateria.id) {
      const { data, error } = await supabase.from('materias').update(payload).eq('id', formMateria.id).select('id, nombre, slug, descripcion, orden, created_at').single();
      setGuardandoMateria(false);
      if (error || !data) {
        return showAlert('error', error?.code === '23505' ? 'Ya existe una materia con ese nombre o slug.' : 'No se pudo actualizar la materia.');
      }
      setMaterias((prev) => prev.map((materia) => (materia.id === formMateria.id ? (data as Materia) : materia)).sort((a, b) => a.orden - b.orden || (a.nombre || '').localeCompare(b.nombre || '')));
      showAlert('success', 'Materia actualizada.');
    } else {
      const { data, error } = await supabase.from('materias').insert([payload]).select('id, nombre, slug, descripcion, orden, created_at').single();
      setGuardandoMateria(false);
      if (error || !data) {
        return showAlert('error', error?.code === '23505' ? 'Ya existe una materia con ese nombre o slug.' : 'No se pudo crear la materia.');
      }
      setMaterias((prev) => [...prev, data as Materia].sort((a, b) => a.orden - b.orden || (a.nombre || '').localeCompare(b.nombre || '')));
      showAlert('success', 'Materia creada.');
    }

    setFormMateria(null);
    router.refresh();
  };

  const eliminarMateria = async (materia: Materia) => {
    if (!confirm(`¿Eliminar la materia "${materia.nombre || ''}"?`)) return;

    const { error } = await supabase.from('materias').delete().eq('id', materia.id);
    if (error) {
      return showAlert(
        'error',
        error.code === '23503'
          ? 'Debe vaciar o mover los temas primero.'
          : 'No se pudo eliminar la materia.'
      );
    }

    setMaterias((prev) => prev.filter((fila) => fila.id !== materia.id));
    if (formMateria?.id === materia.id) setFormMateria(null);
    showAlert('success', 'Materia eliminada.');
    router.refresh();
  };

  const abrirNuevoTema = () => {
    setSlugTemaManual(false);
    setFormTema(formTemaVacio(siguienteOrden(temas), materias[0]?.id || ''));
  };

  const editarTema = (tema: Tema) => {
    setSlugTemaManual(true);
    setFormTema({
      id: tema.id,
      materia_id: tema.materia_id || '',
      nombre: tema.nombre || '',
      slug: tema.slug || '',
      orden: String(tema.orden ?? 0),
    });
  };

  const cambiarNombreTema = (nombre: string) => {
    setFormTema((prev) =>
      prev ? { ...prev, nombre, slug: slugTemaManual ? prev.slug : slugificar(nombre) } : prev
    );
  };

  const guardarTema = async () => {
    if (!formTema) return;
    const nombre = formTema.nombre.trim();
    const slug = slugificar(formTema.slug || nombre);
    const orden = leerOrden(formTema.orden);

    if (!formTema.materia_id) return showAlert('error', 'Selecciona la materia del tema.');
    if (!nombre) return showAlert('error', 'El nombre del tema es obligatorio.');
    if (!slug || !SLUG.test(slug)) return showAlert('error', 'El slug solo puede tener minúsculas, números y guiones.');
    if (orden === null) return showAlert('error', 'El orden debe ser un número entero mayor o igual a 0.');

    const payload = { materia_id: formTema.materia_id, nombre, slug, orden };
    setGuardandoTema(true);

    if (formTema.id) {
      const { data, error } = await supabase.from('temas').update(payload).eq('id', formTema.id).select('id, materia_id, nombre, slug, orden, created_at').single();
      setGuardandoTema(false);
      if (error || !data) {
        return showAlert('error', error?.code === '23505' ? 'Esa materia ya tiene un tema con ese nombre o slug.' : 'No se pudo actualizar el tema.');
      }
      setTemas((prev) => prev.map((tema) => (tema.id === formTema.id ? (data as Tema) : tema)).sort((a, b) => a.orden - b.orden || (a.nombre || '').localeCompare(b.nombre || '')));
      showAlert('success', 'Tema actualizado.');
    } else {
      const { data, error } = await supabase.from('temas').insert([payload]).select('id, materia_id, nombre, slug, orden, created_at').single();
      setGuardandoTema(false);
      if (error || !data) {
        return showAlert('error', error?.code === '23505' ? 'Esa materia ya tiene un tema con ese nombre o slug.' : 'No se pudo crear el tema.');
      }
      setTemas((prev) => [...prev, data as Tema].sort((a, b) => a.orden - b.orden || (a.nombre || '').localeCompare(b.nombre || '')));
      showAlert('success', 'Tema creado.');
    }

    setFormTema(null);
    router.refresh();
  };

  const eliminarTema = async (tema: Tema) => {
    const aviso = `¿Eliminar el tema "${tema.nombre || ''}"? Las lecciones de este tema quedarán sin clasificar.`;
    if (!confirm(aviso)) return;

    const { error } = await supabase.from('temas').delete().eq('id', tema.id);
    if (error) return showAlert('error', 'No se pudo eliminar el tema.');

    setTemas((prev) => prev.filter((fila) => fila.id !== tema.id));
    if (formTema?.id === tema.id) setFormTema(null);
    showAlert('success', 'Tema eliminado.');
    router.refresh();
  };

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

      <div className="bg-slate-900 p-6 rounded-2xl text-white shadow-lg">
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <FolderTree className="text-indigo-400 w-7 h-7" /> Categorías
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Materias y temas de la biblioteca. Las lecciones se clasifican dentro de un tema.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between gap-3">
            <h2 className="font-bold text-gray-800 flex items-center gap-2">
              <FolderTree className="w-5 h-5 text-indigo-500" /> Materias
              <span className="text-xs font-bold text-gray-400">{materias.length}</span>
            </h2>
            <button
              type="button"
              onClick={() => (formMateria ? setFormMateria(null) : abrirNuevaMateria())}
              className={`${
                formMateria ? 'bg-slate-700 text-slate-200 hover:bg-slate-600' : 'bg-indigo-600 text-white hover:bg-indigo-500'
              } px-4 py-2 rounded-xl font-bold flex items-center gap-2 shadow-md transition-all text-sm`}
            >
              {formMateria ? <><X className="w-4 h-4" /> Cancelar</> : <><PlusCircle className="w-4 h-4" /> Añadir</>}
            </button>
          </div>

          {formMateria && (
            <div className="bg-indigo-50/50 p-4 border-b border-indigo-100 space-y-3">
              <h3 className="text-sm font-bold text-indigo-900 flex items-center gap-2">
                {formMateria.id ? <Edit3 className="w-4 h-4" /> : <PlusCircle className="w-4 h-4" />}
                {formMateria.id ? 'Editando materia' : 'Nueva materia'}
              </h3>
              <label className="block">
                <span className="block text-xs font-bold text-indigo-700 uppercase mb-1">Nombre *</span>
                <input
                  type="text"
                  value={formMateria.nombre}
                  onChange={(e) => cambiarNombreMateria(e.target.value)}
                  placeholder="Ej: Matemática"
                  className="w-full p-3 border border-indigo-200 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </label>
              <label className="block">
                <span className="block text-xs font-bold text-indigo-700 uppercase mb-1">Slug</span>
                <input
                  type="text"
                  value={formMateria.slug}
                  onChange={(e) => {
                    setSlugMateriaManual(true);
                    setFormMateria((prev) => (prev ? { ...prev, slug: e.target.value } : prev));
                  }}
                  placeholder="matematica"
                  className="w-full p-3 border border-indigo-200 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-sm"
                />
              </label>
              <label className="block">
                <span className="block text-xs font-bold text-indigo-700 uppercase mb-1">Descripción</span>
                <textarea
                  value={formMateria.descripcion}
                  onChange={(e) => setFormMateria((prev) => (prev ? { ...prev, descripcion: e.target.value } : prev))}
                  rows={2}
                  placeholder="Opcional"
                  className="w-full p-3 border border-indigo-200 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500 outline-none resize-y text-sm"
                />
              </label>
              <label className="block">
                <span className="block text-xs font-bold text-indigo-700 uppercase mb-1">Orden</span>
                <input
                  type="number"
                  min={0}
                  value={formMateria.orden}
                  onChange={(e) => setFormMateria((prev) => (prev ? { ...prev, orden: e.target.value } : prev))}
                  className="w-full p-3 border border-indigo-200 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </label>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setFormMateria(null)}
                  className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2.5 rounded-xl font-bold transition-all text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={guardarMateria}
                  disabled={guardandoMateria}
                  className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg transition-all text-sm"
                >
                  {guardandoMateria ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {formMateria.id ? 'Actualizar' : 'Guardar'}
                </button>
              </div>
            </div>
          )}

          {materias.length === 0 ? (
            <div className="p-10 text-center text-gray-400">
              <p className="font-semibold text-gray-500">Todavía no hay materias.</p>
              <p className="text-sm mt-1">Añade la primera para poder crear temas.</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {materias.map((materia) => (
                <li key={materia.id} className={`p-4 flex items-start justify-between gap-3 ${formMateria?.id === materia.id ? 'bg-indigo-50/60' : ''}`}>
                  <div className="min-w-0">
                    <p className="font-bold text-gray-800 truncate">{materia.nombre || 'Sin nombre'}</p>
                    <p className="text-xs text-gray-400 font-mono truncate">{materia.slug || ''}</p>
                    {materia.descripcion && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{materia.descripcion}</p>}
                    <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mt-1">
                      Orden {materia.orden ?? 0} · {temasPorMateria.get(materia.id) || 0} tema(s)
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => editarMateria(materia)}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors border border-indigo-100"
                    >
                      <Edit3 className="w-3.5 h-3.5" /> Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => eliminarMateria(materia)}
                      title="Eliminar"
                      className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between gap-3">
            <h2 className="font-bold text-gray-800 flex items-center gap-2">
              <Tags className="w-5 h-5 text-indigo-500" /> Temas
              <span className="text-xs font-bold text-gray-400">{temas.length}</span>
            </h2>
            <button
              type="button"
              onClick={() => (formTema ? setFormTema(null) : abrirNuevoTema())}
              disabled={materias.length === 0 && !formTema}
              className={`${
                formTema ? 'bg-slate-700 text-slate-200 hover:bg-slate-600' : 'bg-indigo-600 text-white hover:bg-indigo-500'
              } px-4 py-2 rounded-xl font-bold flex items-center gap-2 shadow-md transition-all text-sm disabled:opacity-40 disabled:pointer-events-none`}
            >
              {formTema ? <><X className="w-4 h-4" /> Cancelar</> : <><PlusCircle className="w-4 h-4" /> Añadir</>}
            </button>
          </div>

          {formTema && (
            <div className="bg-indigo-50/50 p-4 border-b border-indigo-100 space-y-3">
              <h3 className="text-sm font-bold text-indigo-900 flex items-center gap-2">
                {formTema.id ? <Edit3 className="w-4 h-4" /> : <PlusCircle className="w-4 h-4" />}
                {formTema.id ? 'Editando tema' : 'Nuevo tema'}
              </h3>
              <label className="block">
                <span className="block text-xs font-bold text-indigo-700 uppercase mb-1">Materia *</span>
                <select
                  value={formTema.materia_id}
                  onChange={(e) => setFormTema((prev) => (prev ? { ...prev, materia_id: e.target.value } : prev))}
                  className="w-full p-3 border border-indigo-200 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500 outline-none text-gray-700"
                >
                  <option value="">Selecciona una materia</option>
                  {materias.map((materia) => (
                    <option key={materia.id} value={materia.id}>
                      {materia.nombre || 'Sin nombre'}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="block text-xs font-bold text-indigo-700 uppercase mb-1">Nombre *</span>
                <input
                  type="text"
                  value={formTema.nombre}
                  onChange={(e) => cambiarNombreTema(e.target.value)}
                  placeholder="Ej: Funciones lineales"
                  className="w-full p-3 border border-indigo-200 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </label>
              <label className="block">
                <span className="block text-xs font-bold text-indigo-700 uppercase mb-1">Slug</span>
                <input
                  type="text"
                  value={formTema.slug}
                  onChange={(e) => {
                    setSlugTemaManual(true);
                    setFormTema((prev) => (prev ? { ...prev, slug: e.target.value } : prev));
                  }}
                  placeholder="funciones-lineales"
                  className="w-full p-3 border border-indigo-200 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-sm"
                />
              </label>
              <label className="block">
                <span className="block text-xs font-bold text-indigo-700 uppercase mb-1">Orden</span>
                <input
                  type="number"
                  min={0}
                  value={formTema.orden}
                  onChange={(e) => setFormTema((prev) => (prev ? { ...prev, orden: e.target.value } : prev))}
                  className="w-full p-3 border border-indigo-200 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </label>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setFormTema(null)}
                  className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2.5 rounded-xl font-bold transition-all text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={guardarTema}
                  disabled={guardandoTema}
                  className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg transition-all text-sm"
                >
                  {guardandoTema ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {formTema.id ? 'Actualizar' : 'Guardar'}
                </button>
              </div>
            </div>
          )}

          {materias.length === 0 ? (
            <div className="p-10 text-center text-gray-400 text-sm">Crea una materia antes de añadir temas.</div>
          ) : temas.length === 0 ? (
            <div className="p-10 text-center text-gray-400">
              <p className="font-semibold text-gray-500">Todavía no hay temas.</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {temas.map((tema) => {
                const materia = materiasPorId.get(tema.materia_id);
                return (
                  <li key={tema.id} className={`p-4 flex items-start justify-between gap-3 ${formTema?.id === tema.id ? 'bg-indigo-50/60' : ''}`}>
                    <div className="min-w-0">
                      <p className="font-bold text-gray-800 truncate">{tema.nombre || 'Sin nombre'}</p>
                      <p className="text-xs font-semibold text-slate-600 truncate">
                        {materia?.nombre || 'Materia no disponible'}
                      </p>
                      <p className="text-xs text-gray-400 font-mono truncate">{tema.slug || ''}</p>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mt-1">Orden {tema.orden ?? 0}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => editarTema(tema)}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors border border-indigo-100"
                      >
                        <Edit3 className="w-3.5 h-3.5" /> Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => eliminarTema(tema)}
                        title="Eliminar"
                        className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-100"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
