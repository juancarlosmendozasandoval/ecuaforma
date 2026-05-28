'use client';

import { useState, useEffect } from 'react';
import { useSupabase } from '../../../components/AuthProvider';
import Link from 'next/link';
import { 
  ArrowLeft, PlusCircle, Trash2, Save, 
  Video, FileText, CheckSquare, AlertCircle, CheckCircle, RefreshCw,
  Edit3, ArrowUp, ArrowDown, Image as ImageIcon, Type, FunctionSquare, Paperclip, Plus
} from 'lucide-react';

export default function AdminTemarioCursoPage({ params }: { params: { slug: string } }) {
  const { supabase } = useSupabase();
  const [curso, setCurso] = useState<any>(null);
  const [lecciones, setLecciones] = useState<any[]>([]);
  const [simuladoresDb, setSimuladoresDb] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Estados para el formulario
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nuevaSeccion, setNuevaSeccion] = useState('Módulo Principal'); // 🌟 NUEVO: Subnivel
  const [nuevoTitulo, setNuevoTitulo] = useState('');
  const [nuevoVideoUrl, setNuevoVideoUrl] = useState('');
  const [nuevoTexto, setNuevoTexto] = useState('');
  const [nuevoSimuladorId, setNuevoSimuladorId] = useState('');
  
  // 🌟 NUEVO: Estado dinámico para múltiples adjuntos
  const [adjuntos, setAdjuntos] = useState<{ titulo: string, url: string }[]>([]);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const { data: cursoData, error: cursoErr } = await supabase.from('cursos').select('*').eq('slug', params.slug).single();
      if (cursoErr) throw cursoErr;
      setCurso(cursoData);

      const { data: leccionesData } = await supabase.from('lecciones').select('*').eq('curso_id', cursoData.id).order('orden', { ascending: true });
      if (leccionesData) setLecciones(leccionesData);

      const { data: simsData } = await supabase.from('simuladores').select('id, nombre, institucion').eq('is_deleted', false).order('created_at', { ascending: false });
      if (simsData) setSimuladoresDb(simsData);
    } catch (error) {
      console.error(error);
      showAlert('error', 'No se pudo cargar la información.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, [params.slug]);

  const showAlert = (type: 'success' | 'error', text: string) => {
    setAlert({ type, text });
    setTimeout(() => setAlert(null), 4000);
  };

  const resetForm = () => {
    setNuevaSeccion(lecciones.length > 0 ? lecciones[lecciones.length - 1].seccion || 'Módulo Principal' : 'Módulo Principal');
    setNuevoTitulo(''); setNuevoVideoUrl(''); setNuevoTexto(''); setNuevoSimuladorId('');
    setAdjuntos([]);
    setEditingId(null);
    setIsAdding(false);
  };

  const iniciarEdicion = (lec: any) => {
    setEditingId(lec.id);
    setNuevaSeccion(lec.seccion || 'Módulo Principal');
    setNuevoTitulo(lec.titulo);
    setNuevoVideoUrl(lec.video_url || '');
    setNuevoTexto(lec.contenido_texto || '');
    setNuevoSimuladorId(lec.simulador_id || '');
    
    // Cargar adjuntos si existen
    if (lec.adjuntos && Array.isArray(lec.adjuntos)) {
      setAdjuntos(lec.adjuntos);
    } else {
      setAdjuntos([]);
    }

    setIsAdding(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 🌟 LÓGICA DE ADJUNTOS
  const agregarAdjunto = () => setAdjuntos([...adjuntos, { titulo: '', url: '' }]);
  const actualizarAdjunto = (index: number, campo: 'titulo' | 'url', valor: string) => {
    const nuevos = [...adjuntos];
    nuevos[index][campo] = valor;
    setAdjuntos(nuevos);
  };
  const eliminarAdjunto = (index: number) => {
    setAdjuntos(adjuntos.filter((_, i) => i !== index));
  };

  const guardarLeccion = async () => {
    if (!nuevoTitulo.trim()) return showAlert('error', 'El título de la clase es obligatorio.');
    if (!nuevaSeccion.trim()) return showAlert('error', 'El subnivel/sección es obligatorio.');

    // Limpiar adjuntos vacíos
    const adjuntosLimpios = adjuntos.filter(a => a.titulo.trim() !== '' && a.url.trim() !== '');

    const leccionData = {
      curso_id: curso.id,
      seccion: nuevaSeccion.trim(), // 🌟 Guardamos el subnivel
      titulo: nuevoTitulo.trim(),
      video_url: nuevoVideoUrl || null,
      contenido_texto: nuevoTexto || null,
      simulador_id: nuevoSimuladorId || null,
      adjuntos: adjuntosLimpios // 🌟 Guardamos la lista de archivos
    };

    if (editingId) {
      const { data, error } = await supabase.from('lecciones').update(leccionData).eq('id', editingId).select().single();
      if (error) return showAlert('error', 'Error al actualizar.');
      setLecciones(lecciones.map(l => l.id === editingId ? data : l));
      showAlert('success', 'Módulo actualizado.');
    } else {
      const nuevaOrden = lecciones.length > 0 ? lecciones[lecciones.length - 1].orden + 1 : 1;
      const { data, error } = await supabase.from('lecciones').insert([{ ...leccionData, orden: nuevaOrden }]).select().single();
      if (error) return showAlert('error', 'Error al guardar.');
      setLecciones([...lecciones, data]);
      showAlert('success', 'Módulo agregado.');
    }
    resetForm();
  };

  const moverLeccion = async (index: number, direccion: 'up' | 'down') => {
    if (direccion === 'up' && index === 0) return;
    if (direccion === 'down' && index === lecciones.length - 1) return;
    const nuevas = [...lecciones];
    const target = direccion === 'up' ? index - 1 : index + 1;
    const tempOrd = nuevas[index].orden;
    nuevas[index].orden = nuevas[target].orden;
    nuevas[target].orden = tempOrd;
    const temp = nuevas[index];
    nuevas[index] = nuevas[target];
    nuevas[target] = temp;
    setLecciones(nuevas);
    await supabase.from('lecciones').update({ orden: nuevas[index].orden }).eq('id', nuevas[index].id);
    await supabase.from('lecciones').update({ orden: nuevas[target].orden }).eq('id', nuevas[target].id);
  };

  const eliminarLeccion = async (id: string, titulo: string) => {
    if (!confirm(`¿Eliminar permanentemente "${titulo}"?`)) return;
    const { error } = await supabase.from('lecciones').delete().eq('id', id);
    if (!error) {
      setLecciones(lecciones.filter(l => l.id !== id));
      showAlert('success', 'Clase eliminada.');
    }
  };

  // 🌟 Extraer secciones únicas para el autocompletado
  const seccionesUnicas = Array.from(new Set(lecciones.map(l => l.seccion).filter(Boolean)));

  if (loading) return <div className="p-12 text-center text-gray-500 flex flex-col items-center gap-3"><RefreshCw className="w-8 h-8 animate-spin text-indigo-500" /> Cargando temario...</div>;

  return (
    <div className="max-w-5xl mx-auto py-6 space-y-6">
      
      {alert && (
        <div className={`fixed top-5 right-5 z-50 p-4 rounded-xl shadow-xl flex items-center gap-3 font-semibold text-white transition-all ${alert.type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'}`}>
          {alert.type === 'success' ? <CheckCircle className="w-5 h-5"/> : <AlertCircle className="w-5 h-5"/>}
          {alert.text}
        </div>
      )}

      {/* Cabecera */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <Link href="/admin/cursos" className="text-gray-500 hover:text-indigo-600 flex items-center gap-1 mb-2 text-sm font-medium transition-colors">
            <ArrowLeft size={16}/> Volver a Cursos
          </Link>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            Estructura: {curso?.nombre}
          </h1>
          <p className="text-gray-500 text-sm mt-1">Organiza por subniveles y añade recursos ilimitados.</p>
        </div>
        <button 
          onClick={() => isAdding ? resetForm() : setIsAdding(true)}
          className={`${isAdding ? 'bg-gray-200 text-gray-700 hover:bg-gray-300' : 'bg-indigo-600 text-white hover:bg-indigo-700'} px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-md transition-all`}
        >
          {isAdding ? 'Cancelar' : <><PlusCircle className="w-5 h-5" /> Nueva Clase</>}
        </button>
      </div>

      {/* Formulario */}
      {isAdding && (
        <div className="bg-indigo-50/50 p-6 rounded-2xl border border-indigo-100 shadow-inner animate-fade-in">
          <h2 className="text-lg font-bold text-indigo-900 mb-6 flex items-center gap-2 border-b border-indigo-100 pb-3">
            {editingId ? <Edit3 className="w-5 h-5"/> : <PlusCircle className="w-5 h-5"/>}
            {editingId ? 'Editando Clase' : 'Configurar Nueva Clase'}
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            
            {/* 🌟 CAMPO SUBNIVEL */}
            <div>
              <label className="block text-xs font-bold text-indigo-700 uppercase mb-1">Subnivel / Categoría *</label>
              <input 
                type="text" 
                list="secciones"
                value={nuevaSeccion} 
                onChange={(e) => setNuevaSeccion(e.target.value)} 
                placeholder="Ej: Aritmética, Álgebra, Geometría..." 
                className="w-full p-3 border border-indigo-200 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500 outline-none font-semibold text-indigo-900" 
              />
              <datalist id="secciones">
                {seccionesUnicas.map((sec: any) => <option key={sec} value={sec} />)}
              </datalist>
            </div>

            <div>
              <label className="block text-xs font-bold text-indigo-700 uppercase mb-1">Título de la Clase *</label>
              <input type="text" value={nuevoTitulo} onChange={(e) => setNuevoTitulo(e.target.value)} placeholder="Ej: Ley de Signos" className="w-full p-3 border border-indigo-200 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>

            <div>
              <label className="block text-xs font-bold text-indigo-700 uppercase mb-1">Video Principal (Opcional)</label>
              <div className="relative">
                <Video className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
                <input type="text" value={nuevoVideoUrl} onChange={(e) => setNuevoVideoUrl(e.target.value)} placeholder="https://youtube.com/..." className="w-full pl-10 p-3 border border-indigo-200 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-indigo-700 uppercase mb-1">Examen / Simulador (Opcional)</label>
              <div className="relative">
                <CheckSquare className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
                <select value={nuevoSimuladorId} onChange={(e) => setNuevoSimuladorId(e.target.value)} className="w-full pl-10 p-3 border border-indigo-200 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500 outline-none text-gray-700">
                  <option value="">-- Ninguno --</option>
                  {simuladoresDb.map(sim => (
                    <option key={sim.id} value={sim.id}>[{sim.institucion}] {sim.nombre}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Texto Avanzado */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-indigo-700 uppercase mb-1">Teoría y Apuntes (Markdown/LaTeX)</label>
              <div className="bg-white border border-indigo-200 border-b-0 rounded-t-xl p-2 flex gap-4 text-xs font-medium text-gray-500">
                <span className="flex items-center gap-1"><Type size={14}/> **Negrita**</span>
                <span className="flex items-center gap-1"><ImageIcon size={14}/> ![alt](URL-Imagen)</span>
                <span className="flex items-center gap-1 text-blue-600 bg-blue-50 px-2 py-0.5 rounded"><FunctionSquare size={14}/> \[ x^2 \] Ecuaciones</span>
              </div>
              <textarea 
                value={nuevoTexto} 
                onChange={(e) => setNuevoTexto(e.target.value)} 
                rows={6} 
                placeholder="Escribe el contenido teórico de esta clase..." 
                className="w-full p-4 border border-indigo-200 rounded-b-xl bg-white focus:ring-2 focus:ring-indigo-500 outline-none resize-y font-mono text-sm"
              ></textarea>
            </div>

            {/* 🌟 GESTOR DE MATERIAL ADJUNTO MÚLTIPLE */}
            <div className="md:col-span-2 bg-white p-5 rounded-xl border border-indigo-100 shadow-sm">
              <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-2">
                <label className="text-sm font-bold text-indigo-900 flex items-center gap-2">
                  <Paperclip className="w-4 h-4"/> Recursos Adicionales (PDFs, Enlaces, Docs)
                </label>
                <button type="button" onClick={agregarAdjunto} className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-indigo-100 transition-colors">
                  <Plus size={14}/> Añadir Recurso
                </button>
              </div>
              
              {adjuntos.length === 0 ? (
                <p className="text-sm text-gray-400 italic text-center py-2">No hay recursos adicionales. Presiona "Añadir Recurso".</p>
              ) : (
                <div className="space-y-3">
                  {adjuntos.map((adj, index) => (
                    <div key={index} className="flex flex-col sm:flex-row gap-3 bg-gray-50 p-3 rounded-lg border border-gray-200">
                      <input 
                        type="text" 
                        value={adj.titulo} 
                        onChange={(e) => actualizarAdjunto(index, 'titulo', e.target.value)}
                        placeholder="Ej: Diapositivas PDF" 
                        className="flex-1 p-2 text-sm border border-gray-300 rounded-md outline-none focus:border-indigo-500"
                      />
                      <input 
                        type="text" 
                        value={adj.url} 
                        onChange={(e) => actualizarAdjunto(index, 'url', e.target.value)}
                        placeholder="URL (https://...)" 
                        className="flex-[2] p-2 text-sm border border-gray-300 rounded-md outline-none focus:border-indigo-500 font-mono"
                      />
                      <button type="button" onClick={() => eliminarAdjunto(index)} className="p-2 text-rose-500 hover:bg-rose-100 rounded-md transition-colors">
                        <Trash2 size={16}/>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3">
            {editingId && (
              <button onClick={resetForm} className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-6 py-3 rounded-xl font-bold transition-all">
                Cancelar
              </button>
            )}
            <button onClick={guardarLeccion} className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg transition-all">
              <Save className="w-5 h-5"/> {editingId ? 'Actualizar Clase' : 'Guardar Clase'}
            </button>
          </div>
        </div>
      )}

      {/* 🌟 TEMARIO AGRUPADO POR SECCIÓN */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 bg-slate-900 border-b border-gray-100 font-bold text-white flex justify-between items-center">
          <span>Temario del Curso</span>
          <span className="text-xs bg-slate-700 px-2 py-1 rounded text-indigo-200">{lecciones.length} Clases</span>
        </div>
        
        {lecciones.length === 0 ? (
          <div className="p-12 text-center text-gray-400 flex flex-col items-center">
            <FileText className="w-12 h-12 mb-3 opacity-20" />
            <p>Aún no hay clases. ¡Agrega la primera!</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {lecciones.map((lec, index) => {
              // Lógica visual: Mostrar el título de la sección si es la primera clase de esa sección
              const mostrarHeaderSeccion = index === 0 || lecciones[index - 1].seccion !== lec.seccion;
              
              return (
                <div key={lec.id}>
                  
                  {/* HEADER DE SUBNIVEL */}
                  {mostrarHeaderSeccion && (
                    <div className="bg-indigo-50 border-y border-indigo-100 px-5 py-3 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                      <h3 className="font-bold text-indigo-900 uppercase tracking-wide text-sm">{lec.seccion || 'Módulo Principal'}</h3>
                    </div>
                  )}

                  <div className="p-4 pl-6 flex flex-col sm:flex-row sm:items-center gap-4 hover:bg-gray-50 transition-colors group">
                    <div className="flex sm:flex-col items-center gap-1 text-gray-300">
                      <button onClick={() => moverLeccion(index, 'up')} disabled={index === 0} className="hover:text-indigo-600 disabled:opacity-30 p-1"><ArrowUp className="w-4 h-4"/></button>
                      <button onClick={() => moverLeccion(index, 'down')} disabled={index === lecciones.length - 1} className="hover:text-indigo-600 disabled:opacity-30 p-1"><ArrowDown className="w-4 h-4"/></button>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-gray-800 truncate">{lec.titulo}</h4>
                      <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[11px] font-bold uppercase tracking-wider">
                        {lec.video_url && <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 flex items-center gap-1"><Video size={10}/> Video</span>}
                        {lec.contenido_texto && <span className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-100 flex items-center gap-1"><FileText size={10}/> Teoría</span>}
                        {lec.adjuntos && lec.adjuntos.length > 0 && <span className="text-purple-600 bg-purple-50 px-2 py-0.5 rounded border border-purple-100 flex items-center gap-1"><Paperclip size={10}/> {lec.adjuntos.length} Archivos</span>}
                        {lec.simulador_id && <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 flex items-center gap-1"><CheckSquare size={10}/> Examen</span>}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 border-t sm:border-t-0 pt-3 sm:pt-0">
                      <button onClick={() => iniciarEdicion(lec)} className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors border border-indigo-100">
                        <Edit3 className="w-3.5 h-3.5"/> Editar
                      </button>
                      <button onClick={() => eliminarLeccion(lec.id, lec.titulo)} className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-100">
                        <Trash2 className="w-4 h-4"/>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}