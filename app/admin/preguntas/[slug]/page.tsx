'use client';

import { useEffect, useState } from 'react';
import { useSupabase } from '../../../components/AuthProvider';
import { Trash2, Plus, Save, ArrowLeft, CheckCircle, Youtube, ImageIcon, Type, ArrowUp, ArrowDown } from 'lucide-react';
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
  const [reordering, setReordering] = useState(false); // Estado para bloquear mientras reordena

  // Estado del formulario de nueva pregunta
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
      .order('orden', { ascending: true }) // Prioridad al orden manual
      .order('id', { ascending: true });   // Fallback

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

  // --- LÓGICA DE REORDENAMIENTO ---
  
  // Función maestra para mover preguntas
  const reorderQuestion = async (currentIndex: number, newPositionDisplay: number) => {
    // Convertir de "Posición Visual (1-based)" a "Índice Array (0-based)"
    const targetIndex = newPositionDisplay - 1;

    // Validaciones
    if (targetIndex < 0 || targetIndex >= preguntas.length || targetIndex === currentIndex) return;

    setReordering(true);

    // 1. Crear copia del array y manipularlo localmente
    const newPreguntas = [...preguntas];
    const [movedItem] = newPreguntas.splice(currentIndex, 1); // Sacar de la vieja posición
    newPreguntas.splice(targetIndex, 0, movedItem); // Meter en la nueva posición

    // 2. Preparar actualizaciones masivas
    // Solo necesitamos actualizar las preguntas cuyo índice no coincida con su 'orden' actual
    const updates = newPreguntas.map((p, index) => ({
      id: p.id,
      simulador_id: simulador.id, // Requerido para upsert a veces según RLS
      orden: index + 1, // El nuevo orden es su posición en el array + 1
      // Necesitamos pasar otros campos requeridos si la tabla lo exige, 
      // pero normalmente upsert solo actualiza lo que pasas si hay ID.
      // Para seguridad en Supabase, pasamos solo lo necesario.
    }));

    try {
      // 3. Enviar a Supabase (Upsert actualiza si existe el ID)
      const { error } = await supabase
        .from('preguntas')
        .upsert(updates, { onConflict: 'id' });

      if (error) throw error;

      // 4. Recargar
      cargarPreguntas(simulador.id);
      
    } catch (error: any) {
      alert('Error al reordenar: ' + error.message);
      setReordering(false);
    }
  };

  // Wrapper para las flechas
  const handleArrowMove = (index: number, direction: 'up' | 'down') => {
    const newPos = direction === 'up' ? index : index + 2; // index + 1 es actual, -1 es arriba (0), +1 es abajo (2)
    // Explicación:
    // Si estoy en index 5 (Pos 6).
    // Arriba: Quiero ir a Pos 5. (index 5)
    // Abajo: Quiero ir a Pos 7. (index + 2)
    reorderQuestion(index, direction === 'up' ? index : index + 2);
  };

  // --- FIN LÓGICA DE REORDENAMIENTO ---

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
      default: respuestaCorrecta = opciones[0]; // A
    }

    try {
      const nextOrder = preguntas.length + 1; // Siempre al final

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

      setNewQuestion({
        pregunta: '',
        opcionA: '', opcionB: '', opcionC: '', opcionD: '',
        typeA: 'text', typeB: 'text', typeC: 'text', typeD: 'text',
        correcta: 'A',
        feedback: '',
        imgUrl: '',
        youtubeUrl: ''
      });
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
          <Link href="/admin" className="text-gray-500 hover:text-blue-600 flex items-center gap-1 mb-2 text-sm">
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
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-lg border border-blue-100">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-blue-800 border-b pb-2">
            <Plus size={20}/> Agregar Nueva Pregunta
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
                  <div key={letra} className={`relative p-3 rounded-lg border-2 ${newQuestion.correcta === letra ? 'border-green-500 bg-green-50' : 'border-gray-200'}`}>
                    
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

            <div className="bg-gray-50 p-4 rounded-lg space-y-3 border border-gray-200">
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

            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg">
              <Save size={18}/> Guardar Pregunta
            </button>
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
              return (
                <div key={`${p.id}-${index}`} className="bg-white p-3 rounded-lg shadow-sm border border-gray-200 hover:border-blue-400 transition-all group relative">
                  <div className="flex justify-between items-start mb-2 gap-2">
                    <div className="flex items-center gap-2 flex-1">
                       {/* INPUT DE ORDEN MANUAL */}
                       <div className="flex flex-col items-center">
                         <input 
                            type="number"
                            disabled={reordering}
                            defaultValue={index + 1}
                            onBlur={(e) => {
                                const val = parseInt(e.target.value);
                                if (!isNaN(val) && val !== index + 1) {
                                    reorderQuestion(index, val);
                                } else {
                                    e.target.value = (index + 1).toString(); // Reset si es inválido
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
                       
                       <p className="text-sm text-gray-800 font-medium line-clamp-2 leading-tight flex-1 pt-1" title={p.pregunta}>
                         {p.pregunta}
                       </p>
                    </div>

                    <button onClick={() => handleDelete(p.id)} disabled={reordering} className="text-gray-300 hover:text-red-500 transition-colors p-1">
                      <Trash2 size={16}/>
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2 mt-1 ml-12">
                    <div className="text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded flex items-center gap-1 w-fit max-w-full">
                      <CheckCircle size={10} className="flex-shrink-0"/> 
                      {p.respuesta.type === 'image' ? (
                        <span className="italic">Imagen</span>
                      ) : (
                        <span className="truncate max-w-[100px]">{p.respuesta.value}</span>
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