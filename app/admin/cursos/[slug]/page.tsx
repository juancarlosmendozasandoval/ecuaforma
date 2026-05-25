'use client';

import { useState, useEffect } from 'react';
import { useSupabase } from '../../../components/AuthProvider';
import Link from 'next/link';
import { 
  ArrowLeft, PlusCircle, Trash2, GripVertical, Save, 
  Video, FileText, CheckSquare, AlertCircle, CheckCircle, RefreshCw
} from 'lucide-react';

export default function AdminTemarioCursoPage({ params }: { params: { slug: string } }) {
  const { supabase } = useSupabase();
  const [curso, setCurso] = useState<any>(null);
  const [lecciones, setLecciones] = useState<any[]>([]);
  const [simuladoresDb, setSimuladoresDb] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Estados para el formulario de Nueva Lección
  const [isAdding, setIsAdding] = useState(false);
  const [nuevoTitulo, setNuevoTitulo] = useState('');
  const [nuevoVideoUrl, setNuevoVideoUrl] = useState('');
  const [nuevoTexto, setNuevoTexto] = useState('');
  const [nuevoSimuladorId, setNuevoSimuladorId] = useState('');

  const cargarDatos = async () => {
    setLoading(true);
    try {
      // 1. Obtener datos del curso actual
      const { data: cursoData, error: cursoErr } = await supabase
        .from('cursos')
        .select('*')
        .eq('slug', params.slug)
        .single();
      
      if (cursoErr) throw cursoErr;
      setCurso(cursoData);

      // 2. Obtener sus lecciones ordenadas
      const { data: leccionesData } = await supabase
        .from('lecciones')
        .select('*')
        .eq('curso_id', cursoData.id)
        .order('orden', { ascending: true });
      
      if (leccionesData) setLecciones(leccionesData);

      // 3. Obtener lista de simuladores disponibles para enlazar
      const { data: simsData } = await supabase
        .from('simuladores')
        .select('id, nombre, institucion')
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });
      
      if (simsData) setSimuladoresDb(simsData);

    } catch (error) {
      console.error(error);
      showAlert('error', 'No se pudo cargar la información del curso.');
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

  const guardarLeccion = async () => {
    if (!nuevoTitulo.trim()) return showAlert('error', 'El título del módulo es obligatorio.');

    const nuevaOrden = lecciones.length > 0 ? lecciones[lecciones.length - 1].orden + 1 : 1;

    const { data, error } = await supabase
      .from('lecciones')
      .insert([{
        curso_id: curso.id,
        titulo: nuevoTitulo,
        video_url: nuevoVideoUrl || null,
        contenido_texto: nuevoTexto || null,
        simulador_id: nuevoSimuladorId || null,
        orden: nuevaOrden
      }])
      .select()
      .single();

    if (error) {
      showAlert('error', 'Error al guardar la lección.');
    } else {
      setLecciones([...lecciones, data]);
      showAlert('success', 'Módulo agregado exitosamente.');
      // Limpiar formulario
      setNuevoTitulo(''); setNuevoVideoUrl(''); setNuevoTexto(''); setNuevoSimuladorId('');
      setIsAdding(false);
    }
  };

  const eliminarLeccion = async (id: string, titulo: string) => {
    if (!confirm(`¿Eliminar la clase "${titulo}" permanentemente?`)) return;

    const { error } = await supabase.from('lecciones').delete().eq('id', id);

    if (error) {
      showAlert('error', 'Error al eliminar la lección.');
    } else {
      setLecciones(lecciones.filter(l => l.id !== id));
      showAlert('success', 'Clase eliminada.');
    }
  };

  if (loading) return <div className="p-12 text-center text-gray-500 flex flex-col items-center gap-3"><RefreshCw className="w-8 h-8 animate-spin text-indigo-500" /> Cargando temario...</div>;
  if (!curso) return <div className="p-10 text-center text-red-500">Curso no encontrado.</div>;

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
            Estructura: {curso.nombre}
          </h1>
          <p className="text-gray-500 text-sm mt-1">Añade videos, material teórico y simuladores a este curso.</p>
        </div>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-md transition-all"
        >
          {isAdding ? 'Cancelar' : <><PlusCircle className="w-5 h-5" /> Agregar Módulo</>}
        </button>
      </div>

      {/* Formulario para agregar lección (Oculto por defecto) */}
      {isAdding && (
        <div className="bg-indigo-50/50 p-6 rounded-2xl border border-indigo-100 shadow-inner animate-fade-in">
          <h2 className="text-lg font-bold text-indigo-900 mb-4 flex items-center gap-2">
            <PlusCircle className="w-5 h-5"/> Nueva Clase / Módulo
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-indigo-700 uppercase mb-1">Título de la Clase *</label>
              <input type="text" value={nuevoTitulo} onChange={(e) => setNuevoTitulo(e.target.value)} placeholder="Ej: Fundamentos de Álgebra" className="w-full p-3 border border-indigo-200 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>

            <div>
              <label className="block text-xs font-bold text-indigo-700 uppercase mb-1">Enlace de Video (YouTube/Vimeo)</label>
              <div className="relative">
                <Video className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
                <input type="text" value={nuevoVideoUrl} onChange={(e) => setNuevoVideoUrl(e.target.value)} placeholder="https://youtube.com/..." className="w-full pl-10 p-3 border border-indigo-200 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-indigo-700 uppercase mb-1">Enlazar un Simulador (Examen)</label>
              <div className="relative">
                <CheckSquare className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
                <select value={nuevoSimuladorId} onChange={(e) => setNuevoSimuladorId(e.target.value)} className="w-full pl-10 p-3 border border-indigo-200 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500 outline-none text-gray-700">
                  <option value="">-- Ninguno (Clase normal) --</option>
                  {simuladoresDb.map(sim => (
                    <option key={sim.id} value={sim.id}>[{sim.institucion}] {sim.nombre}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-indigo-700 uppercase mb-1">Material Teórico / Apuntes (Opcional)</label>
              <textarea value={nuevoTexto} onChange={(e) => setNuevoTexto(e.target.value)} rows={4} placeholder="Escribe el material de apoyo o instrucciones adicionales para esta clase..." className="w-full p-3 border border-indigo-200 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500 outline-none resize-none"></textarea>
            </div>
          </div>

          <div className="flex justify-end">
            <button onClick={guardarLeccion} className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg transition-all">
              <Save className="w-5 h-5"/> Guardar Módulo
            </button>
          </div>
        </div>
      )}

      {/* Lista de Lecciones / Temario */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 bg-gray-50 border-b border-gray-100 font-bold text-gray-700">
          Temario Actual ({lecciones.length} módulos)
        </div>
        
        {lecciones.length === 0 ? (
          <div className="p-12 text-center text-gray-400 flex flex-col items-center">
            <FileText className="w-12 h-12 mb-3 opacity-20" />
            <p>Este curso aún no tiene clases. ¡Haz clic en "Agregar Módulo" para empezar!</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {lecciones.map((lec, index) => (
              <div key={lec.id} className="p-4 flex items-center gap-4 hover:bg-blue-50/30 transition-colors group">
                <div className="text-gray-300 group-hover:text-gray-500 cursor-move">
                  <GripVertical className="w-5 h-5"/>
                </div>
                
                <div className="w-8 h-8 bg-indigo-100 text-indigo-700 rounded-lg flex items-center justify-center font-bold text-sm shrink-0">
                  {index + 1}
                </div>
                
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-gray-800 truncate">{lec.titulo}</h3>
                  <div className="flex items-center gap-3 mt-1 text-xs font-medium">
                    {lec.video_url && (
                      <span className="text-blue-600 flex items-center gap-1 bg-blue-50 px-2 py-0.5 rounded-md">
                        <Video size={12}/> Video Adjunto
                      </span>
                    )}
                    {lec.contenido_texto && (
                      <span className="text-amber-600 flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded-md">
                        <FileText size={12}/> Lectura
                      </span>
                    )}
                    {lec.simulador_id && (
                      <span className="text-emerald-700 flex items-center gap-1 bg-emerald-100 px-2 py-0.5 rounded-md">
                        <CheckSquare size={12}/> Examen Vinculado
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => eliminarLeccion(lec.id, lec.titulo)}
                    className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    title="Eliminar Clase"
                  >
                    <Trash2 className="w-5 h-5"/>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}