'use client';

import { useEffect, useRef, useState } from 'react';
import { useSupabase } from '../../../components/AuthProvider';
import { 
  Trash2, Plus, Save, ArrowLeft, CheckCircle, Youtube, 
  ImageIcon, Type, ArrowUp, ArrowDown, Edit3, X, Library, Search, GripVertical, Upload, Loader2, Shuffle
} from 'lucide-react';
import Link from 'next/link';
import { parsearCargaMasiva, separarBloques } from '@/lib/simuladores/parsearCargaMasiva';
import type { Materia, Tema } from '@/types/biblioteca';

// Estructura de una opción para la BD
interface Option {
  value: string;
  type: 'text' | 'image';
}

/** Pregunta del examen: el contenido viene de `preguntas` y el orden del vínculo. */
type PreguntaExamen = {
  id: number;
  vinculoId: string;
  orden: number;
  pregunta: string;
  opciones: Option[] | null;
  respuesta: Option | null;
  feedback: string | null;
  pregunta_img_url: string | null;
  youtube_url: string | null;
};

type PreguntaBanco = {
  id: number;
  pregunta: string;
};

const escaparLike = (texto: string) => texto.replace(/[\\%_]/g, (caracter) => `\\${caracter}`);

const EJEMPLO_CARGA_MASIVA = `Q: Si $f(x) = 2x + 1$, ¿cuál es $f(3)$?
O: 5 | 6 | 7 | 8
R: 7

Q: ¿Cuál es la capital del Ecuador?
O: Quito | Guayaquil | Cuenca
R: Quito`;

function normalizarVinculo(fila: { id?: string; orden?: number; preguntas?: unknown }): PreguntaExamen | null {
  const cruda = Array.isArray(fila.preguntas) ? fila.preguntas[0] : fila.preguntas;
  if (!cruda || typeof cruda !== 'object' || !fila.id) return null;
  const pregunta = cruda as Omit<PreguntaExamen, 'vinculoId' | 'orden'>;
  return { ...pregunta, orden: fila.orden || 0, vinculoId: fila.id };
}

export default function GestorPreguntasPage({ params }: { params: { slug: string } }) {
  const { supabase } = useSupabase();
  const [simulador, setSimulador] = useState<any>(null);
  const [preguntas, setPreguntas] = useState<PreguntaExamen[]>([]);
  const [loading, setLoading] = useState(true);
  const [reordering, setReordering] = useState(false);
  const dragIndexRef = useRef<number | null>(null);

  const [bancoAbierto, setBancoAbierto] = useState(false);
  const [busquedaBanco, setBusquedaBanco] = useState('');
  const [resultadosBanco, setResultadosBanco] = useState<PreguntaBanco[]>([]);
  const [buscandoBanco, setBuscandoBanco] = useState(false);
  const [agregandoId, setAgregandoId] = useState<number | null>(null);

  const [cargaAbierta, setCargaAbierta] = useState(false);
  const [textoMasivo, setTextoMasivo] = useState('');
  const [guardandoMasivo, setGuardandoMasivo] = useState(false);
  const [materias, setMaterias] = useState<Pick<Materia, 'id' | 'nombre'>[]>([]);
  const [temas, setTemas] = useState<Pick<Tema, 'id' | 'nombre' | 'materia_id'>[]>([]);
  const [materiaMasivaId, setMateriaMasivaId] = useState('');
  const [temaMasivoId, setTemaMasivoId] = useState('');

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

  const getYoutubeId = (url: string | null) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  useEffect(() => {
    const fetchData = async () => {
      const [{ data: simData, error: simError }, { data: materiasData }, { data: temasData }] = await Promise.all([
        supabase.from('simuladores').select('*').eq('slug', params.slug).single(),
        supabase.from('materias').select('id, nombre').order('orden').order('nombre'),
        supabase.from('temas').select('id, materia_id, nombre').order('orden').order('nombre'),
      ]);

      if (simError || !simData) {
        alert('Simulador no encontrado');
        return;
      }
      setSimulador(simData);
      setMaterias((materiasData || []) as Pick<Materia, 'id' | 'nombre'>[]);
      setTemas((temasData || []) as Pick<Tema, 'id' | 'nombre' | 'materia_id'>[]);
      cargarPreguntas(simData.id);
    };
    fetchData();
  }, [params.slug, supabase]);

  const cargarPreguntas = async (simuladorId: string) => {
    const { data, error } = await supabase
      .from('simulador_preguntas')
      .select('id, orden, preguntas(*)')
      .eq('simulador_id', simuladorId)
      .order('orden', { ascending: true });

    if (error) {
      alert('No se pudieron cargar las preguntas del examen.');
      setPreguntas([]);
    } else {
      setPreguntas((data || []).map(normalizarVinculo).filter((fila): fila is PreguntaExamen => !!fila));
    }
    setLoading(false);
    setReordering(false);
  };

  const siguienteOrden = () => preguntas.reduce((max, fila) => Math.max(max, Number(fila.orden) || 0), 0) + 1;

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
  const iniciarEdicion = (p: PreguntaExamen) => {
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

    try {
      const resultados = await Promise.all(
        newPreguntas.map((fila, index) =>
          supabase.from('simulador_preguntas').update({ orden: index + 1 }).eq('id', fila.vinculoId)
        )
      );
      const error = resultados.find((resultado) => resultado.error)?.error;
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
        const { data: creada, error } = await supabase.from('preguntas').insert({
          pregunta: newQuestion.pregunta,
          opciones: opciones,
          respuesta: respuestaCorrecta,
          feedback: newQuestion.feedback,
          pregunta_img_url: newQuestion.imgUrl || null,
          youtube_url: newQuestion.youtubeUrl || null,
        }).select('id').single();

        if (error || !creada) throw error || new Error('No se pudo crear la pregunta.');

        const { error: errorVinculo } = await supabase.from('simulador_preguntas').insert({
          simulador_id: simulador.id,
          pregunta_id: creada.id,
          orden: siguienteOrden(),
        });
        if (errorVinculo) throw errorVinculo;
      }

      resetForm();
      cargarPreguntas(simulador.id);
      
    } catch (err: any) {
      alert('Error guardando: ' + err.message);
    }
  };

  const handleDelete = async (vinculoId: string) => {
    if (!confirm('¿Quitar esta pregunta del examen? Seguirá disponible en el banco.')) return;
    const { error } = await supabase.from('simulador_preguntas').delete().eq('id', vinculoId);
    if (error) {
      alert('No se pudo quitar la pregunta del examen.');
      return;
    }
    if (simulador) cargarPreguntas(simulador.id);
  };

  const buscarEnBanco = async (texto: string) => {
    setBuscandoBanco(true);
    const termino = texto.trim().slice(0, 100);
    let consulta = supabase.from('preguntas').select('id, pregunta').order('id', { ascending: false }).limit(40);
    if (termino) consulta = consulta.ilike('pregunta', `%${escaparLike(termino)}%`);
    const { data, error } = await consulta;
    setBuscandoBanco(false);
    if (error) {
      setResultadosBanco([]);
      return;
    }
    const yaEstan = new Set(preguntas.map((fila) => fila.id));
    setResultadosBanco(((data || []) as PreguntaBanco[]).filter((fila) => !yaEstan.has(fila.id)));
  };

  useEffect(() => {
    if (!bancoAbierto) return;
    const timer = setTimeout(() => { void buscarEnBanco(busquedaBanco); }, 250);
    return () => clearTimeout(timer);
  }, [bancoAbierto, busquedaBanco, preguntas]);

  const agregarDesdeBanco = async (preguntaId: number) => {
    if (!simulador) return;
    if (preguntas.some((fila) => fila.id === preguntaId)) {
      alert('Esta pregunta ya está en el examen.');
      return;
    }
    setAgregandoId(preguntaId);
    const { error } = await supabase.from('simulador_preguntas').insert({
      simulador_id: simulador.id,
      pregunta_id: preguntaId,
      orden: siguienteOrden(),
    });
    setAgregandoId(null);
    if (error) {
      alert(error.code === '23505' ? 'Esta pregunta ya está en el examen.' : 'No se pudo agregar la pregunta.');
      return;
    }
    await cargarPreguntas(simulador.id);
  };

  const temasMasivos = materiaMasivaId
    ? temas.filter((tema) => tema.materia_id === materiaMasivaId)
    : [];

  const parseoMasivo = cargaAbierta ? parsearCargaMasiva(textoMasivo) : { preguntas: [], errores: [] };
  const textoMasivoVacio = !textoMasivo.trim();

  const cambiarMateriaMasiva = (materiaId: string) => {
    setMateriaMasivaId(materiaId);
    setTemaMasivoId('');
  };

  const guardarCargaMasiva = async () => {
    if (!simulador || guardandoMasivo) return;

    const { preguntas: lote, errores } = parsearCargaMasiva(textoMasivo);
    if (textoMasivo.trim() && errores.length > 0) return;
    if (lote.length === 0) return;
    if (materiaMasivaId && !temaMasivoId) {
      alert('Si eliges una materia, también elige el tema.');
      return;
    }
    if (temaMasivoId && !temasMasivos.some((tema) => tema.id === temaMasivoId)) {
      alert('Ese tema no pertenece a la materia elegida.');
      return;
    }

    setGuardandoMasivo(true);
    let orden = siguienteOrden();
    let guardadas = 0;

    try {
      for (const item of lote) {
        const { data: creada, error } = await supabase.from('preguntas').insert({
          pregunta: item.pregunta,
          opciones: item.opciones,
          respuesta: item.respuesta,
          feedback: null,
          pregunta_img_url: null,
          tema_id: temaMasivoId || null,
        }).select('id').single();

        if (error || !creada) throw error || new Error('No se pudo crear la pregunta.');

        const { error: errorVinculo } = await supabase.from('simulador_preguntas').insert({
          simulador_id: simulador.id,
          pregunta_id: creada.id,
          orden,
        });
        if (errorVinculo) throw errorVinculo;

        orden += 1;
        guardadas += 1;
      }

      setTextoMasivo('');
      setCargaAbierta(false);
      alert(`${guardadas} preguntas agregadas al examen.`);
    } catch (err: any) {
      const bloques = separarBloques(textoMasivo);
      if (guardadas > 0 && guardadas < bloques.length) {
        setTextoMasivo(bloques.slice(guardadas).join('\n\n'));
      }
      alert(
        guardadas > 0
          ? `Se guardaron ${guardadas} de ${lote.length}. El resto sigue en el cuadro. ${err?.message || ''}`.trim()
          : 'Error en la carga masiva: ' + (err?.message || 'No se pudieron guardar las preguntas.')
      );
    } finally {
      if (guardadas > 0) await cargarPreguntas(simulador.id);
      setGuardandoMasivo(false);
    }
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
            {simulador.institucion} • {simulador.es_dinamico
              ? `Dinámico: ${simulador.cantidad_preguntas || 0} preguntas al azar por intento`
              : `${preguntas.length} preguntas cargadas`}
          </p>
        </div>
        <Link href={`/simulador/${simulador.slug}`} target="_blank" className="bg-green-100 text-green-700 px-4 py-2 rounded-lg font-bold hover:bg-green-200 transition text-sm flex items-center gap-2">
           Ver Simulador Real <ArrowLeft className="rotate-180" size={16}/>
        </Link>
      </div>

      {simulador.es_dinamico ? (
        <div className="bg-violet-50 border border-violet-200 rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-bold text-violet-900 flex items-center gap-2">
            <Shuffle size={20}/> Mega-Simulador Dinámico
          </h2>
          <p className="text-sm text-violet-800">
            Este simulador no usa una lista fija: en cada intento toma <strong>{simulador.cantidad_preguntas || 0}</strong> preguntas
            al azar del banco, entre los temas de abajo. Para cambiar el banco, asigna temas a las preguntas
            (carga masiva o script de inyección); para cambiar la configuración, edítalo en el gestor.
          </p>
          <div className="flex flex-wrap gap-2">
            {((simulador.temas_dinamicos || []) as string[]).map((temaId) => {
              const tema = temas.find((t) => t.id === temaId);
              const materia = materias.find((m) => m.id === tema?.materia_id);
              return (
                <span key={temaId} className="bg-white border border-violet-200 text-violet-800 text-xs font-bold px-3 py-1.5 rounded-full">
                  {tema ? `${materia?.nombre || 'Sin materia'} · ${tema.nombre || 'Sin nombre'}` : 'Tema eliminado'}
                </span>
              );
            })}
          </div>
          <Link href="/admin/simuladores" className="inline-flex items-center gap-1.5 text-sm font-bold text-violet-700 hover:underline">
            <Edit3 size={14}/> Editar configuración en el gestor
          </Link>
        </div>
      ) : (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Columna Izquierda: FORMULARIO */}
        <div className={`lg:col-span-2 p-6 rounded-xl shadow-lg border ${editingId ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-blue-100'}`}>
          <div className={`mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-2 ${editingId ? 'border-indigo-200' : 'border-gray-100'}`}>
            <h2 className={`text-lg font-bold flex items-center gap-2 ${editingId ? 'text-indigo-800' : 'text-blue-800'}`}>
              {editingId ? <><Edit3 size={20}/> Editando Pregunta</> : <><Plus size={20}/> Agregar Nueva Pregunta</>}
            </h2>
            {!editingId && (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => { setBusquedaBanco(''); setBancoAbierto(true); }}
                  className="bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50 px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2"
                >
                  <Library size={16}/> Añadir desde el Banco
                </button>
                <button
                  type="button"
                  onClick={() => setCargaAbierta(true)}
                  className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2"
                >
                  <Upload size={16}/> Carga Masiva
                </button>
              </div>
            )}
          </div>
          
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
                <div
                  key={p.vinculoId}
                  onDragOver={(e) => { if (!reordering && !isEditing) e.preventDefault(); }}
                  onDrop={() => {
                    const origen = dragIndexRef.current;
                    dragIndexRef.current = null;
                    if (origen === null || origen === index || reordering || isEditing) return;
                    reorderQuestion(origen, index + 1);
                  }}
                  className={`bg-white p-3 rounded-lg shadow-sm border transition-all group relative ${isEditing ? 'border-indigo-500 ring-2 ring-indigo-200' : 'border-gray-200 hover:border-blue-400'}`}
                >
                  
                  <div className="flex justify-between items-start mb-2 gap-2">
                    <div className="flex items-center gap-2 flex-1">
                       <button
                         type="button"
                         draggable={!reordering && !isEditing}
                         onDragStart={() => { dragIndexRef.current = index; }}
                         onDragEnd={() => { dragIndexRef.current = null; }}
                         disabled={reordering || isEditing}
                         title="Arrastrar para reordenar"
                         className="text-gray-300 hover:text-blue-600 cursor-grab active:cursor-grabbing disabled:cursor-not-allowed p-0.5"
                       >
                         <GripVertical size={16}/>
                       </button>
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
                      <button onClick={() => handleDelete(p.vinculoId)} disabled={reordering} className="text-gray-400 hover:text-red-500 transition-colors p-1.5 bg-gray-50 hover:bg-red-50 rounded-lg" title="Quitar del examen">
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
      )}

      {bancoAbierto && (
        <div className="fixed inset-0 z-[80] bg-slate-900/50 flex items-end sm:items-center justify-center p-4" onClick={() => setBancoAbierto(false)}>
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-gray-100 max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-gray-100 flex items-center justify-between gap-3">
              <h2 className="font-bold text-gray-800 flex items-center gap-2">
                <Library className="w-5 h-5 text-indigo-500"/> Banco de preguntas
              </h2>
              <button type="button" onClick={() => setBancoAbierto(false)} className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg">
                <X className="w-5 h-5"/>
              </button>
            </div>
            <div className="p-4 border-b border-gray-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4"/>
                <input
                  type="search"
                  value={busquedaBanco}
                  onChange={(e) => setBusquedaBanco(e.target.value)}
                  placeholder="Buscar por el enunciado..."
                  className="w-full pl-9 p-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  autoFocus
                />
              </div>
            </div>
            <div className="overflow-y-auto p-2">
              {buscandoBanco ? (
                <p className="p-6 text-center text-sm text-gray-400">Buscando...</p>
              ) : resultadosBanco.length === 0 ? (
                <p className="p-6 text-center text-sm text-gray-400">No hay preguntas para agregar.</p>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {resultadosBanco.map((fila) => (
                    <li key={fila.id} className="p-3 flex items-start justify-between gap-3">
                      <p className="text-sm text-gray-800 line-clamp-2">{fila.pregunta || 'Sin enunciado'}</p>
                      <button
                        type="button"
                        disabled={agregandoId === fila.id}
                        onClick={() => agregarDesdeBanco(fila.id)}
                        className="shrink-0 px-3 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-100 disabled:opacity-50"
                      >
                        {agregandoId === fila.id ? 'Agregando...' : 'Agregar'}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {cargaAbierta && (
        <div
          className="fixed inset-0 z-[80] bg-slate-900/50 flex items-end sm:items-center justify-center p-4"
          onClick={() => { if (!guardandoMasivo) setCargaAbierta(false); }}
        >
          <div
            className="bg-white w-full max-w-3xl rounded-2xl shadow-xl border border-gray-100 max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-gray-100 flex items-center justify-between gap-3">
              <h2 className="font-bold text-gray-800 flex items-center gap-2">
                <Upload className="w-5 h-5 text-slate-600"/> Carga masiva
              </h2>
              <button
                type="button"
                disabled={guardandoMasivo}
                onClick={() => setCargaAbierta(false)}
                className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg disabled:opacity-40"
              >
                <X className="w-5 h-5"/>
              </button>
            </div>

            <div className="overflow-y-auto p-4 space-y-4">
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Ejemplo</p>
                <pre className="text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-700 whitespace-pre-wrap">{EJEMPLO_CARGA_MASIVA}</pre>
                <p className="text-xs text-gray-500 mt-2">
                  Separa cada pregunta con una línea en blanco. Las opciones van en una sola línea, divididas por |.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-indigo-700 uppercase mb-1">Materia</label>
                  <select
                    value={materiaMasivaId}
                    disabled={guardandoMasivo}
                    onChange={(e) => cambiarMateriaMasiva(e.target.value)}
                    className="w-full p-3 border border-indigo-200 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm text-gray-700 disabled:opacity-50"
                  >
                    <option value="">Sin clasificar</option>
                    {materias.map((materia) => (
                      <option key={materia.id} value={materia.id}>{materia.nombre || 'Sin nombre'}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-indigo-700 uppercase mb-1">Tema</label>
                  <select
                    value={temaMasivoId}
                    disabled={guardandoMasivo || !materiaMasivaId}
                    onChange={(e) => setTemaMasivoId(e.target.value)}
                    className="w-full p-3 border border-indigo-200 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm text-gray-700 disabled:opacity-50"
                  >
                    <option value="">
                      {materiaMasivaId ? 'Selecciona un tema' : 'Primero elige una materia'}
                    </option>
                    {temasMasivos.map((tema) => (
                      <option key={tema.id} value={tema.id}>{tema.nombre || 'Sin nombre'}</option>
                    ))}
                  </select>
                  {materiaMasivaId && temasMasivos.length === 0 && (
                    <p className="text-xs text-rose-500 mt-1">Esta materia todavía no tiene temas.</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Preguntas</label>
                <textarea
                  value={textoMasivo}
                  onChange={(e) => setTextoMasivo(e.target.value)}
                  disabled={guardandoMasivo}
                  rows={12}
                  placeholder={'Q: Enunciado\nO: Opción 1 | Opción 2 | Opción 3\nR: Opción 2'}
                  className="w-full p-3 border border-gray-300 rounded-xl font-mono text-sm focus:ring-2 focus:ring-indigo-500 outline-none disabled:opacity-60"
                />
              </div>

              {!textoMasivoVacio && parseoMasivo.errores.length > 0 && (
                <ul className="text-sm text-rose-700 bg-rose-50 border border-rose-100 rounded-xl p-3 space-y-1">
                  {parseoMasivo.errores.map((error, indice) => (
                    <li key={`${indice}-${error}`}>{error}</li>
                  ))}
                </ul>
              )}

              {!textoMasivoVacio && parseoMasivo.errores.length === 0 && (
                <p className="text-sm font-medium text-emerald-700">
                  {parseoMasivo.preguntas.length} {parseoMasivo.preguntas.length === 1 ? 'pregunta lista' : 'preguntas listas'} para guardar.
                </p>
              )}
            </div>

            <div className="p-4 border-t border-gray-100">
              <button
                type="button"
                onClick={guardarCargaMasiva}
                disabled={
                  guardandoMasivo
                  || textoMasivoVacio
                  || parseoMasivo.errores.length > 0
                  || (!!materiaMasivaId && !temaMasivoId)
                }
                className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2"
              >
                {guardandoMasivo ? (
                  <><Loader2 className="w-5 h-5 animate-spin"/> Guardando...</>
                ) : (
                  <><Save className="w-5 h-5"/> Guardar preguntas</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}