'use client';

import { useEffect, useState } from 'react';
import { useSupabase } from '../../../components/AuthProvider';
import { 
  Trash2, Plus, Save, ArrowLeft, CheckCircle, Youtube, 
  ImageIcon, Type, ArrowUp, ArrowDown, Edit3, X 
} from 'lucide-react';
import Link from 'next/link';

// Estructura de una opción para la BD
interface Option {
  value: string;
  type: 'text' | 'image';
}

export default function GestorPreguntasPage({ params }: { params: { slug: string } }) {
  const { supabase } = useSupabase();
  const [simulador, setSimulador] = useState<any>(null);
  const [preguntas, setPreguntas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [reordering, setReordering] = useState(false);

  // 🌟 ESTADO NUEVO: Para saber qué pregunta estamos editando
  const [editingId, setEditingId] = useState<number | null>(null);

  // Estado del formulario de nueva/editar pregunta
  const [newQuestion, setNewQuestion] = useState({
    pregunta: '',
    opcionA: '',
    opcionB: '',
    opcionC: '',
    opcionD: '',
    typeA: 'text' as 'text' | 'image',
    typeB: 'text' as 'text' | 'image',
    typeC: 'text' as 'text' | 'image',
    typeD: 'text' as 'text' | 'image',
    correcta: 'A',
    feedback: '',
    imgUrl: '',
    youtubeUrl: ''
  });

  const getYoutubeId = (url: string) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  useEffect(() => {
    const fetchData = async () => {
      const { data: simData, error: simError } = await supabase
        .from('simuladores')
        .select('*')
        .eq('slug', params.slug)
        .single();

      if (simError || !simData) {
        alert('Simulador no encontrado');
        return;
      }
      setSimulador(simData);
      cargarPreguntas(simData.id);
    };
    fetchData();
  }, [params.slug, supabase]);

  const cargarPreguntas = async (simuladorId: string) => {
    const { data } = await supabase
      .from('preguntas')
      .select('*')
      .eq('simulador_id', simuladorId)
      .order('orden', { ascending: true })
      .order('id', { ascending: true });

    if (data) setPreguntas(data);
    setLoading(false);
    setReordering(false);
  };

  const handleInputChange = (e: any) => {
    setNewQuestion({ ...newQuestion, [e.target.name]: e.target.value });
  };

  const setOptionType = (letra: 'A' | 'B' | 'C' | 'D', type: 'text' | 'image') => {
    setNewQuestion({ ...newQuestion, [`type${letra}`]: type });
  };

  // 🌟 FUNCIÓN NUEVA: Para limpiar el formulario
  const resetForm = () => {
    setEditingId(null);
    setNewQuestion({
      pregunta: '',
      opcionA: '', opcionB: '', opcionC: '', opcionD: '',
      typeA: 'text', typeB: 'text', typeC: 'text', typeD: 'text',
      correcta: 'A',
      feedback: '',
      imgUrl: '',
      youtubeUrl: ''
    });
  };

  // 🌟 FUNCIÓN NUEVA: Para cargar los datos de una pregunta en el formulario
  const iniciarEdicion = (p: any) => {
    setEditingId(p.id);

    // Mapear opciones de la BD
    const opA = p.opciones?.[0] || { value: '', type: 'text' };
    const opB = p.opciones?.[1] || { value: '', type: 'text' };
    const opC = p.opciones?.[2] || { value: '', type: 'text' };
    const opD = p.opciones?.[3] || { value: '', type: 'text' };

    // Determinar la letra correcta
    let correcta = 'A';
    if (p.respuesta?.value === opB.value) correcta = 'B';
    else if (p.respuesta?.value === opC.value) correcta = 'C';
    else if (p.respuesta?.value === opD.value) correcta = 'D';

    setNewQuestion({
      pregunta: p.pregunta || '',
      opcionA: opA.value, opcionB: opB.value, opcionC: opC.value, opcionD: opD.value,
      typeA: opA.type, typeB: opB.type, typeC: opC.type, typeD: opD.type,
      correcta: correcta,
      feedback: p.feedback || '',
      imgUrl: p.pregunta_img_url || '',
      youtubeUrl: p.youtube_url || ''
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // --- LÓGICA DE REORDENAMIENTO CORREGIDA ---
  const reorderQuestion = async (currentIndex: number, newPositionDisplay: number) => {
    const targetIndex = newPositionDisplay - 1;

    if (targetIndex < 0 || targetIndex >= preguntas.length || targetIndex === currentIndex) return;

    setReordering(true);

    const newPreguntas = [...preguntas];
    const [movedItem] = newPreguntas.splice(currentIndex, 1);
    newPreguntas.splice(targetIndex, 0, movedItem);

    const updates = newPreguntas.map((p, index) => ({
      ...p,
      orden: index + 1
    }));

    try {
      const { error } = await supabase
        .from('preguntas')
        .upsert(updates, { onConflict: 'id' });

      if (error) throw error;
      cargarPreguntas(simulador.id);
      
    } catch (error: any) {
      console.error(error);
      alert('Error al reordenar: ' + error.message);
      setReordering(false);
    }
  };

  const handleArrowMove = (index: number, direction: 'up' | 'down') => {
    reorderQuestion(index, direction === 'up' ? index : index + 2);
  };
  // --- FIN LÓGICA DE REORDENAMIENTO ---

  // 🌟 FUNCIÓN MODIFICADA: Ahora guarda o actualiza dependiendo si estamos editando
  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!simulador) return;

    const opciones: Option[] = [
      { value: newQuestion.opcionA, type: newQuestion.typeA },
      { value: newQuestion.opcionB, type: newQuestion.typeB },
      { value: newQuestion.opcionC, type: newQuestion.typeC },
      { value: newQuestion.opcionD, type: newQuestion.typeD },
    ];

    let respuestaCorrecta: Option;
    switch (newQuestion.correcta) {
      case 'B': respuestaCorrecta = opciones[1]; break;
      case 'C': respuestaCorrecta = opciones[2]; break;
      case 'D': respuestaCorrecta = opciones[3]; break;
      default: respuestaCorrecta = opciones[0];
    }

    try {
      if (editingId) {
        // MODO ACTUALIZAR
        const { error } = await supabase.from('preguntas').update({
          pregunta: newQuestion.pregunta,
          opciones: opciones,
          respuesta: respuestaCorrecta,
          feedback: newQuestion.feedback,
          pregunta_img_url: newQuestion.imgUrl || null,
          youtube_url: newQuestion.youtubeUrl || null
        }).eq('id', editingId);

        if (error) throw error;
        alert('Pregunta actualizada correctamente');

      } else {
        // MODO CREAR
        const nextOrder = preguntas.length + 1;
        const { error } = await supabase.from('preguntas').insert({
          simulador_id: simulador.id,
          pregunta: newQuestion.pregunta,
          opciones: opciones,
          respuesta: respuestaCorrecta,
          feedback: newQuestion.feedback,
          pregunta_img_url: newQuestion.imgUrl || null,
          youtube_url: newQuestion.youtubeUrl || null,
          orden: nextOrder
        });

        if (error) throw error;
      }

      resetForm();
      cargarPreguntas(simulador.id);
      
    } catch (err: any) {
      alert('Error guardando: ' + err.message);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Estás seguro de borrar esta pregunta?')) return;
    await supabase.from('preguntas').delete().eq('id', id);
    if (simulador) cargarPreguntas(simulador.id);
  };

  if (loading) return <div className="p-10 text-center">Cargando editor...</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      
      {/* Cabecera */}
      <div className="flex items-center justify-between">
        <div>
          <Link href="/admin/simuladores" className="text-gray-500 hover:text-blue-600 flex items-center gap-1 mb-2 text-sm">
            <ArrowLeft size={16}/> Volver al panel
          </Link>
          <h1 className="text-2xl font-bold text-gray-800">
            Editando: {simulador.nombre}
          </h1>
          <p className="text-gray-500 text-sm">
            {simulador.institucion} • {preguntas.length} preguntas cargadas
          </p>
        </div>
        <Link href={`/simulador/${simulador.slug}`} target="_blank" className="bg-green-100 text-green-700 px-4 py-2 rounded-lg font-bold hover:bg-green-200 transition text-sm flex items-center gap-2">
           Ver Simulador Real <ArrowLeft className="rotate-180" size={16}/>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Columna Izquierda: FORMULARIO */}
        <div className={`lg:col-span-2 p-6 rounded-xl shadow-lg border ${editingId ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-blue-100'}`}>
          <h2 className={`text-lg font-bold mb-4 flex items-center gap-2 border-b pb-2 ${editingId ? 'text-indigo-800' : 'text-blue-800'}`}>
            {editingId ? <><Edit3 size={20}/> Editando Pregunta</> : <><Plus size={20}/> Agregar Nueva Pregunta</>}
          </h2>
          
          <form onSubmit={handleSaveQuestion} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Enunciado</label>
              <textarea
                name="pregunta"
                value={newQuestion.pregunta}
                onChange={handleInputChange}
                required
                rows={3}
                placeholder="Escribe la pregunta..."
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {['A', 'B', 'C', 'D'].map((letra) => {
                // @ts-ignore
                const currentType = newQuestion[`type${letra}`];
                // @ts-ignore
                const currentValue = newQuestion[`opcion${letra}`];
                
                return (
                  <div key={letra} className={`relative p-3 rounded-lg border-2 ${newQuestion.correcta === letra ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-white'}`}>
                    
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                         <input
                          type="radio"
                          name="correcta"
                          value={letra}
                          checked={newQuestion.correcta === letra}
                          onChange={handleInputChange}
                          className="w-4 h-4 cursor-pointer text-green-600 focus:ring-green-500"
                        />
                        <span className="font-bold text-gray-600">Opción {letra}</span>
                      </div>
                      
                      <div className="flex bg-gray-100 rounded-md p-0.5">
                        <button
                          type="button"
                          // @ts-ignore
                          onClick={() => setOptionType(letra, 'text')}
                          className={`p-1 rounded ${currentType === 'text' ? 'bg-white shadow text-blue-600' : 'text-gray-400'}`}
                          title="Texto"
                        >
                          <Type size={14}/>
                        </button>
                        <button
                          type="button"
                           // @ts-ignore
                          onClick={() => setOptionType(letra, 'image')}
                          className={`p-1 rounded ${currentType === 'image' ? 'bg-white shadow text-purple-600' : 'text-gray-400'}`}
                          title="Imagen URL"
                        >
                          <ImageIcon size={14}/>
                        </button>
                      </div>
                    </div>

                    <input
                      type="text"
                      name={`opcion${letra}`}
                      value={currentValue}
                      onChange={handleInputChange}
                      required
                      placeholder={currentType === 'image' ? "Pega la URL de la imagen..." : `Respuesta ${letra}`}
                      className="w-full bg-transparent outline-none border-b border-gray-300 focus:border-blue-500 text-sm py-1"
                    />
                    
                    {currentType === 'image' && currentValue && (
                      <div className="mt-2 h-16 w-full bg-gray-100 rounded flex items-center justify-center overflow-hidden border border-gray-200">
                        <img src={currentValue} alt="Vista previa" className="h-full object-contain" onError={(e) => e.currentTarget.style.display = 'none'} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="bg-white p-4 rounded-lg space-y-3 border border-gray-200 shadow-sm">
               <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">Recursos Extra</h3>
               <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Feedback / Explicación</label>
                <input
                  type="text"
                  name="feedback"
                  value={newQuestion.feedback}
                  onChange={handleInputChange}
                  placeholder="Texto que aparece al responder..."
                  className="w-full p-2 border border-gray-300 rounded outline-none text-sm"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1 flex items-center gap-1">
                    <ImageIcon size={14}/> URL Imagen Pregunta
                  </label>
                  <input
                    type="text"
                    name="imgUrl"
                    value={newQuestion.imgUrl}
                    onChange={handleInputChange}
                    placeholder="https://..."
                    className="w-full p-2 border border-gray-300 rounded outline-none text-sm font-mono text-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1 flex items-center gap-1">
                    <Youtube size={14} className="text-red-600"/> URL Video YouTube
                  </label>
                  <input
                    type="text"
                    name="youtubeUrl"
                    value={newQuestion.youtubeUrl}
                    onChange={handleInputChange}
                    placeholder="https://youtube.com/watch?v=..."
                    className="w-full p-2 border border-gray-300 rounded outline-none text-sm font-mono text-gray-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              {editingId && (
                <button 
                  type="button" 
                  onClick={resetForm}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all"
                >
                  <X size={18}/> Cancelar
                </button>
              )}
              <button 
                type="submit" 
                className={`font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg text-white ${editingId ? 'flex-[2] bg-emerald-600 hover:bg-emerald-700' : 'w-full bg-blue-600 hover:bg-blue-700'}`}
              >
                <Save size={18}/> {editingId ? 'Actualizar Pregunta' : 'Guardar Pregunta'}
              </button>
            </div>
          </form>
        </div>

        {/* Columna Derecha: LISTA */}
        <div className="lg:col-span-1 flex flex-col h-[calc(100vh-100px)]">
          <h3 className="font-bold text-gray-500 uppercase text-xs tracking-wider mb-3 flex justify-between items-center">
            <span>Preguntas Agregadas ({preguntas.length})</span>
            {reordering && <span className="text-orange-500 text-xs animate-pulse">Guardando orden...</span>}
          </h3>
          
          <div className="flex-1 overflow-y-auto pr-2 space-y-3">
            {preguntas.map((p, index) => {
              const youtubeId = getYoutubeId(p.youtube_url);
              const isEditing = editingId === p.id;

              return (
                <div key={`${p.id}-${index}`} className={`bg-white p-3 rounded-lg shadow-sm border transition-all group relative ${isEditing ? 'border-indigo-500 ring-2 ring-indigo-200' : 'border-gray-200 hover:border-blue-400'}`}>
                  
                  <div className="flex justify-between items-start mb-2 gap-2">
                    <div className="flex items-center gap-2 flex-1">
                       {/* INPUT DE ORDEN MANUAL */}
                       <div className="flex flex-col items-center">
                         <input 
                            type="number"
                            disabled={reordering || isEditing}
                            defaultValue={index + 1}
                            onBlur={(e) => {
                                const val = parseInt(e.target.value);
                                if (!isNaN(val) && val !== index + 1) {
                                    reorderQuestion(index, val);
                                } else {
                                    e.target.value = (index + 1).toString();
                                }
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.currentTarget.blur();
                                }
                            }}
                            className="w-10 h-8 text-center font-bold text-blue-700 bg-blue-50 rounded border border-blue-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                         />
                         
                         {/* FLECHAS */}
                         <div className="flex gap-1 mt-1 opacity-20 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => handleArrowMove(index, 'up')} disabled={index === 0 || reordering} className="hover:text-blue-600 disabled:opacity-0"><ArrowUp size={12}/></button>
                            <button onClick={() => handleArrowMove(index, 'down')} disabled={index === preguntas.length - 1 || reordering} className="hover:text-blue-600 disabled:opacity-0"><ArrowDown size={12}/></button>
                         </div>
                       </div>
                       
                       <p className={`text-sm font-medium line-clamp-2 leading-tight flex-1 pt-1 ${isEditing ? 'text-indigo-700 font-bold' : 'text-gray-800'}`} title={p.pregunta}>
                         {p.pregunta}
                       </p>
                    </div>

                    <div className="flex flex-col gap-1">
                      {/* 🌟 BOTÓN EDITAR */}
                      <button onClick={() => iniciarEdicion(p)} disabled={reordering} className="text-gray-400 hover:text-indigo-600 transition-colors p-1.5 bg-gray-50 hover:bg-indigo-50 rounded-lg" title="Editar pregunta">
                        <Edit3 size={16}/>
                      </button>
                      <button onClick={() => handleDelete(p.id)} disabled={reordering} className="text-gray-400 hover:text-red-500 transition-colors p-1.5 bg-gray-50 hover:bg-red-50 rounded-lg" title="Eliminar">
                        <Trash2 size={16}/>
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mt-1 ml-12">
                    <div className="text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded flex items-center gap-1 w-fit max-w-full">
                      <CheckCircle size={10} className="flex-shrink-0"/> 
                      {p.respuesta?.type === 'image' ? (
                        <span className="italic">Imagen</span>
                      ) : (
                        <span className="truncate max-w-[100px]">{p.respuesta?.value}</span>
                      )}
                    </div>
                    {youtubeId && (
                      <div className="w-6 h-5 bg-red-100 rounded flex items-center justify-center">
                         <Youtube size={10} className="text-red-600"/>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}