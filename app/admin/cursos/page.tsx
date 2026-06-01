'use client';

import { useState, useEffect } from 'react';
import { useSupabase } from '../../components/AuthProvider';
import Link from 'next/link';
import { 
  GraduationCap, Eye, EyeOff, Trash2, ListVideo, 
  CheckCircle, AlertCircle, PlusCircle, Save, X, DollarSign 
} from 'lucide-react';

export default function AdminCursosPage() {
  const { supabase } = useSupabase();
  const [cursos, setCursos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 🌟 NUEVOS ESTADOS PARA CREAR CURSOS
  const [isAdding, setIsAdding] = useState(false);
  const [nombre, setNombre] = useState('');
  const [slug, setSlug] = useState('');
  const [institucion, setInstitucion] = useState('');
  const [descripcion, setDescripcion] = useState('');

  // 🌟 ESTADOS PARA EL MANEJO DE PRECIOS
  const [esPago, setEsPago] = useState(false);
  const [precio, setPrecio] = useState('0.00');

  const fetchCursos = async () => {
    setLoading(true);
    // Traemos los cursos y el conteo de cuántas lecciones tiene cada uno
    const { data, error } = await supabase
      .from('cursos')
      .select('*, lecciones(count)')
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

    if (!error && data) setCursos(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchCursos();
  }, [supabase]);

  const showAlert = (type: 'success' | 'error', text: string) => {
    setAlert({ type, text });
    setTimeout(() => setAlert(null), 4000);
  };

  // 🌟 AUTO-COMPLETAR EL SLUG (URL amigable)
  const handleNombreChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valor = e.target.value;
    setNombre(valor);
    const autoSlug = valor.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    setSlug(autoSlug);
  };

  const resetForm = () => {
    setNombre('');
    setSlug('');
    setInstitucion('');
    setDescripcion('');
    setEsPago(false);
    setPrecio('0.00');
    setIsAdding(false);
  };

  // 🌟 GUARDAR NUEVO CURSO EN LA BASE DE DATOS (CON PRECIOS)
  const guardarCurso = async () => {
    if (!nombre.trim() || !slug.trim() || !institucion.trim()) {
      return showAlert('error', 'Nombre, Slug e Institución son campos obligatorios.');
    }

    setActionLoading('saving');
    
    const { data, error } = await supabase
      .from('cursos')
      .insert([{ 
        nombre: nombre.trim(), 
        slug: slug.trim(), 
        institucion: institucion.trim(), 
        descripcion: descripcion.trim(),
        publico: false, // Los cursos nuevos nacen ocultos por defecto
        es_pago: esPago,
        precio: esPago ? parseFloat(precio) : 0.00
      }])
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        showAlert('error', 'Ya existe un curso con esa URL (Slug). Usa uno distinto.');
      } else {
        showAlert('error', 'Error al crear el curso.');
      }
    } else {
      // Agregamos el curso a la vista actualizando la tabla localmente
      setCursos([{ ...data, lecciones: [{ count: 0 }] }, ...cursos]);
      showAlert('success', 'Curso creado exitosamente. Ya puedes agregarle el temario.');
      resetForm();
    }
    
    setActionLoading(null);
  };

  // Cambiar privacidad (Público/Privado)
  const togglePublico = async (id: string, currentStatus: boolean) => {
    setActionLoading(`public-${id}`);
    const { error } = await supabase
      .from('cursos')
      .update({ publico: !currentStatus })
      .eq('id', id);

    if (error) {
      showAlert('error', 'Error al actualizar visibilidad.');
    } else {
      setCursos(cursos.map(c => c.id === id ? { ...c, publico: !currentStatus } : c));
      showAlert('success', 'Visibilidad actualizada.');
    }
    setActionLoading(null);
  };

  // Borrado Lógico (Soft Delete)
  const archivarCurso = async (id: string, nombreCurso: string) => {
    if (!confirm(`¿Archivar el curso "${nombreCurso}"? Los alumnos ya no podrán verlo.`)) return;
    
    setActionLoading(`delete-${id}`);
    const { error } = await supabase
      .from('cursos')
      .update({ is_deleted: true, publico: false }) // Lo ocultamos por seguridad
      .eq('id', id);

    if (error) {
      showAlert('error', 'No se pudo archivar el curso.');
    } else {
      setCursos(cursos.filter(c => c.id !== id));
      showAlert('success', 'Curso archivado correctamente.');
    }
    setActionLoading(null);
  };

  // Obtener lista única de instituciones para el datalist
  const institucionesUnicas = Array.from(new Set(cursos.map(c => c.institucion).filter(Boolean)));

  return (
    <div className="max-w-6xl mx-auto py-6 space-y-6">
      {alert && (
        <div className={`fixed top-5 right-5 z-50 p-4 rounded-xl shadow-xl flex items-center gap-3 font-semibold text-white transition-all ${
          alert.type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'
        }`}>
          {alert.type === 'success' ? <CheckCircle className="w-5 h-5"/> : <AlertCircle className="w-5 h-5"/>}
          {alert.text}
        </div>
      )}

      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <GraduationCap className="text-indigo-600 w-8 h-8" /> Panel de Cursos (LMS)
          </h1>
          <p className="text-gray-500 mt-1 text-sm">Administra los programas académicos y estructura el temario de las clases.</p>
        </div>
        <button 
          onClick={() => isAdding ? resetForm() : setIsAdding(true)}
          className={`${isAdding ? 'bg-gray-200 text-gray-700 hover:bg-gray-300' : 'bg-indigo-600 hover:bg-indigo-700 text-white'} px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-md transition-all`}
        >
          {isAdding ? <><X className="w-5 h-5" /> Cancelar</> : <><PlusCircle className="w-5 h-5" /> Nuevo Curso</>}
        </button>
      </div>

      {/* 🌟 FORMULARIO DE CREACIÓN DE CURSO */}
      {isAdding && (
        <div className="bg-indigo-50/50 p-6 rounded-2xl border border-indigo-100 shadow-inner animate-fade-in">
          <h2 className="text-lg font-bold text-indigo-900 mb-4 flex items-center gap-2">
            <PlusCircle className="w-5 h-5"/> Configurar Nuevo Curso
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-bold text-indigo-700 uppercase mb-1">Nombre del Curso *</label>
              <input 
                type="text" 
                value={nombre} 
                onChange={handleNombreChange} 
                placeholder="Ej: Curso Completo Policía Nacional" 
                className="w-full p-3 border border-indigo-200 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500 outline-none" 
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-indigo-700 uppercase mb-1">URL Amigable (Slug) *</label>
              <input 
                type="text" 
                value={slug} 
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, '-'))} 
                placeholder="ej: curso-policia" 
                className="w-full p-3 border border-indigo-200 rounded-xl bg-gray-50 focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-sm" 
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-indigo-700 uppercase mb-1">Institución / Fuerza *</label>
              <input 
                type="text" 
                list="instituciones-list"
                value={institucion} 
                onChange={(e) => setInstitucion(e.target.value)} 
                placeholder="Ej: Policía, FAE, Armada..." 
                className="w-full p-3 border border-indigo-200 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500 outline-none" 
              />
              <datalist id="instituciones-list">
                {institucionesUnicas.map(inst => <option key={inst} value={inst} />)}
              </datalist>
            </div>

            <div>
              <label className="block text-xs font-bold text-indigo-700 uppercase mb-1">Descripción Corta</label>
              <input 
                type="text" 
                value={descripcion} 
                onChange={(e) => setDescripcion(e.target.value)} 
                placeholder="Breve resumen del contenido del curso..." 
                className="w-full p-3 border border-indigo-200 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500 outline-none" 
              />
            </div>

            {/* 🌟 CONFIGURACIÓN DE PRECIO */}
            <div className="p-4 bg-white rounded-xl border border-indigo-100 flex items-center justify-between shadow-sm md:col-span-2">
              <div>
                <span className="text-xs font-bold text-gray-700 uppercase block">Tipo de Acceso</span>
                <span className="text-xs text-gray-400">¿Este curso requiere un pago?</span>
              </div>
              <div className="flex bg-gray-100 p-1 rounded-xl">
                <button 
                  type="button" 
                  onClick={() => setEsPago(false)} 
                  className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${!esPago ? 'bg-white text-slate-800 shadow' : 'text-gray-400'}`}
                >
                  Gratuito
                </button>
                <button 
                  type="button" 
                  onClick={() => setEsPago(true)} 
                  className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${esPago ? 'bg-indigo-600 text-white shadow' : 'text-gray-400'}`}
                >
                  De Pago
                </button>
              </div>
            </div>

            {esPago && (
              <div className="p-4 bg-white rounded-xl border border-indigo-100 flex items-center gap-3 shadow-sm animate-fade-in md:col-span-2">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-indigo-700 uppercase mb-1">Precio del Curso (USD)</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-3 text-emerald-600 w-5 h-5"/>
                    <input 
                      type="number" 
                      step="0.01" 
                      min="0.50" 
                      value={precio} 
                      onChange={(e) => setPrecio(e.target.value)} 
                      className="w-full pl-10 p-3 border border-indigo-200 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-emerald-700" 
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button 
              onClick={guardarCurso} 
              disabled={actionLoading === 'saving'}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg transition-all"
            >
              <Save className="w-5 h-5"/> Crear Curso
            </button>
          </div>
        </div>
      )}

      {/* Lista de Cursos */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-gray-500 animate-pulse">Cargando academia...</div>
        ) : cursos.length === 0 ? (
          <div className="p-10 text-center text-gray-500">No hay cursos registrados.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-500 font-bold text-xs uppercase border-b border-gray-100">
                  <th className="p-4">Curso / Detalles</th>
                  <th className="p-4 text-center">Estado en Web</th>
                  <th className="p-4 text-center">Módulos</th>
                  <th className="p-4 text-right">Contenido</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {cursos.map((curso) => (
                  <tr key={curso.id} className="hover:bg-gray-50/70 transition-colors">
                    <td className="p-4">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold rounded-md uppercase border border-blue-100 w-fit">
                            {curso.institucion}
                          </span>
                          <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md border w-fit ${curso.es_pago ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                            {curso.es_pago ? `$${curso.precio}` : 'GRATIS'}
                          </span>
                        </div>
                        <div className="font-bold text-gray-800 text-base">{curso.nombre}</div>
                        <div className="text-xs text-gray-400 mt-0.5 max-w-md truncate" title={curso.descripcion}>
                          {curso.descripcion}
                        </div>
                      </div>
                    </td>

                    <td className="p-4 text-center">
                      <button
                        onClick={() => togglePublico(curso.id, curso.publico)}
                        disabled={actionLoading === `public-${curso.id}`}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-bold text-xs shadow-sm border transition-all ${
                          curso.publico 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' 
                            : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                        }`}
                      >
                        {curso.publico ? <><Eye className="w-3.5 h-3.5"/> Visible</> : <><EyeOff className="w-3.5 h-3.5"/> Oculto</>}
                      </button>
                    </td>

                    <td className="p-4 text-center">
                      <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-xs font-bold border border-slate-200">
                        {curso.lecciones?.[0]?.count || 0} Clases
                      </span>
                    </td>

                    <td className="p-4">
                      <div className="flex items-center justify-end gap-2">
                        {/* Botón para abrir el estructurador de lecciones */}
                        <Link
                          href={`/admin/cursos/${curso.slug}`}
                          className="px-3 py-2 bg-indigo-50 hover:bg-indigo-600 hover:text-white text-indigo-700 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 border border-indigo-100 hover:border-indigo-600"
                        >
                          <ListVideo className="w-4 h-4" /> Temario
                        </Link>
                        
                        <button
                          onClick={() => archivarCurso(curso.id, curso.nombre)}
                          disabled={actionLoading !== null}
                          className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Archivar Curso"
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