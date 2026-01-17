'use client';

import { useEffect, useState } from 'react';
import { useSupabase } from '../../../components/AuthProvider';
import { Trash2, Plus, Save, ArrowLeft, CheckCircle } from 'lucide-react';
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

  // Estado del formulario de nueva pregunta
  const [newQuestion, setNewQuestion] = useState({
    pregunta: '',
    opcionA: '',
    opcionB: '',
    opcionC: '',
    opcionD: '',
    correcta: 'A', // 'A', 'B', 'C' o 'D'
    feedback: '',
    imgUrl: ''
  });

  // 1. Cargar datos del simulador y sus preguntas al entrar
  useEffect(() => {
    const fetchData = async () => {
      // a) Obtener ID del simulador usando el slug
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

      // b) Obtener preguntas existentes
      cargarPreguntas(simData.id);
    };

    fetchData();
  }, [params.slug, supabase]);

  const cargarPreguntas = async (simuladorId: string) => {
    const { data, error } = await supabase
      .from('preguntas')
      .select('*')
      .eq('simulador_id', simuladorId)
      .order('id', { ascending: true }); // Orden por creación

    if (data) setPreguntas(data);
    setLoading(false);
  };

  const handleInputChange = (e: any) => {
    setNewQuestion({ ...newQuestion, [e.target.name]: e.target.value });
  };

  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!simulador) return;

    // Construir el array de opciones JSON
    const opciones: Option[] = [
      { value: newQuestion.opcionA, type: 'text' },
      { value: newQuestion.opcionB, type: 'text' },
      { value: newQuestion.opcionC, type: 'text' },
      { value: newQuestion.opcionD, type: 'text' },
    ];

    // Identificar cuál es la respuesta correcta (objeto completo)
    let respuestaCorrecta: Option;
    switch (newQuestion.correcta) {
      case 'B': respuestaCorrecta = opciones[1]; break;
      case 'C': respuestaCorrecta = opciones[2]; break;
      case 'D': respuestaCorrecta = opciones[3]; break;
      default: respuestaCorrecta = opciones[0]; // A
    }

    try {
      const { error } = await supabase.from('preguntas').insert({
        simulador_id: simulador.id,
        pregunta: newQuestion.pregunta,
        opciones: opciones, // Se guarda como JSONB
        respuesta: respuestaCorrecta, // Se guarda como JSONB
        feedback: newQuestion.feedback,
        pregunta_img_url: newQuestion.imgUrl || null
      });

      if (error) throw error;

      // Limpiar form y recargar
      setNewQuestion({
        pregunta: '',
        opcionA: '',
        opcionB: '',
        opcionC: '',
        opcionD: '',
        correcta: 'A',
        feedback: '',
        imgUrl: ''
      });
      cargarPreguntas(simulador.id);
      alert('Pregunta guardada correctamente');

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
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      
      {/* Cabecera */}
      <div className="flex items-center justify-between">
        <div>
          <Link href="/admin/crear-simulador" className="text-gray-500 hover:text-blue-600 flex items-center gap-1 mb-2 text-sm">
            <ArrowLeft size={16}/> Volver a crear simulador
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
              <label className="block text-sm font-bold text-gray-700 mb-1">Enunciado de la Pregunta</label>
              <textarea
                name="pregunta"
                value={newQuestion.pregunta}
                onChange={handleInputChange}
                required
                rows={3}
                placeholder="Escribe aquí la pregunta..."
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {['A', 'B', 'C', 'D'].map((letra) => (
                <div key={letra} className={`relative p-3 rounded-lg border-2 ${newQuestion.correcta === letra ? 'border-green-500 bg-green-50' : 'border-gray-200'}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-gray-500">Opción {letra}</span>
                    <input
                      type="radio"
                      name="correcta"
                      value={letra}
                      checked={newQuestion.correcta === letra}
                      onChange={handleInputChange}
                      className="w-4 h-4 cursor-pointer text-green-600 focus:ring-green-500"
                    />
                  </div>
                  <input
                    type="text"
                    name={`opcion${letra}`}
                    // @ts-ignore
                    value={newQuestion[`opcion${letra}`]}
                    onChange={handleInputChange}
                    required
                    placeholder={`Respuesta ${letra}`}
                    className="w-full bg-transparent outline-none border-b border-gray-300 focus:border-blue-500 text-sm py-1"
                  />
                </div>
              ))}
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Retroalimentación (Opcional)</label>
              <input
                type="text"
                name="feedback"
                value={newQuestion.feedback}
                onChange={handleInputChange}
                placeholder="Explicación que aparece al responder (opcional)"
                className="w-full p-3 border border-gray-300 rounded-lg outline-none text-sm"
              />
            </div>
            
             <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">URL Imagen (Opcional)</label>
              <input
                type="text"
                name="imgUrl"
                value={newQuestion.imgUrl}
                onChange={handleInputChange}
                placeholder="https://..."
                className="w-full p-3 border border-gray-300 rounded-lg outline-none text-sm font-mono text-gray-500"
              />
            </div>

            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all">
              <Save size={18}/> Guardar Pregunta
            </button>
          </form>
        </div>

        {/* Columna Derecha: LISTA DE PREGUNTAS */}
        <div className="lg:col-span-1 space-y-4">
          <h3 className="font-bold text-gray-500 uppercase text-xs tracking-wider">
            Preguntas Agregadas ({preguntas.length})
          </h3>
          
          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
            {preguntas.length === 0 && (
              <p className="text-gray-400 text-sm italic text-center py-4">Aún no hay preguntas.</p>
            )}
            
            {preguntas.map((p, index) => (
              <div key={p.id} className="bg-white p-3 rounded-lg shadow border border-gray-100 group hover:border-blue-300 transition-all">
                <div className="flex justify-between items-start mb-2">
                  <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">#{index + 1}</span>
                  <button onClick={() => handleDelete(p.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                    <Trash2 size={16}/>
                  </button>
                </div>
                <p className="text-sm text-gray-800 font-medium line-clamp-2 mb-2" title={p.pregunta}>
                  {p.pregunta}
                </p>
                <div className="text-xs text-green-600 bg-green-50 p-1.5 rounded flex items-center gap-1">
                  <CheckCircle size={12}/> 
                  <span className="truncate max-w-[200px]">{p.respuesta.value}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}