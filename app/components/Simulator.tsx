'use client';

import { useState, useEffect, Fragment } from 'react';
import { CheckCircle, XCircle, Youtube, Repeat, PlayCircle, Loader2, AlertTriangle, ArrowLeft } from 'lucide-react';
import type { SimulatorType, QuestionType, Option } from '../simulador/[slug]/page';
import { useSupabase } from './AuthProvider';
import { InlineMath, BlockMath } from 'react-katex';
import 'katex/dist/katex.min.css';

interface SimulatorProps {
  initialSimulator: SimulatorType;
  initialQuestions: QuestionType[];
  /** Se llama una vez, al mostrar los resultados, con el puntaje de 0 a 100. */
  onFinish?: (score: number) => void;
  /** Si existe, la pantalla de resultados ofrece volver sin repetir el examen. */
  onExit?: () => void;
}

/**
 * Enunciado y opciones: negrita, subrayado, saltos de línea y matemáticas.
 * Acepta $...$, $$...$$, \( \) y \[ \].
 */
const renderFormattedText = (text: string): (string | JSX.Element)[] => {
  if (!text) return [];
  const regex = /(\$\$[\s\S]+?\$\$|\$(?!\$)(?:\\.|[^$\n])+?\$|\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\)|<u>[\s\S]*?<\/u>|\*\*[\s\S]*?\*\*|\n)/g;
  const parts = text.split(regex);

  return parts.filter(Boolean).map((part, index) => {
    if (part.startsWith('$$') && part.endsWith('$$')) {
      return <Formula key={index} display math={part.slice(2, -2)} original={part} />;
    }
    if (part.startsWith('$') && part.endsWith('$') && part.length > 2) {
      return <Formula key={index} math={part.slice(1, -1)} original={part} />;
    }
    if (part.startsWith('\\[') && part.endsWith('\\]')) {
      return <Formula key={index} display math={part.slice(2, -2)} original={part} />;
    }
    if (part.startsWith('\\(') && part.endsWith('\\)')) {
      return <Formula key={index} math={part.slice(2, -2)} original={part} />;
    }
    if (part.startsWith('<u>') && part.endsWith('</u>')) return <u key={index}>{renderFormattedText(part.slice(3, -3))}</u>;
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={index} className="font-bold">{renderFormattedText(part.slice(2, -2))}</strong>;
    if (part === '\n') return <br key={index} />;
    return part;
  });
};

/** Si la fórmula está mal escrita, se deja el texto original en lugar de romper el examen. */
function Formula({ math, original, display = false }: { math: string; original: string; display?: boolean }) {
  const props = {
    math: math.trim(),
    renderError: () => <span>{original}</span>,
  };
  return display ? <BlockMath {...props} /> : <InlineMath {...props} />;
}

function TextoExamen({ texto }: { texto: string }) {
  return <>{renderFormattedText(texto)}</>;
}

const getYoutubeId = (url: string | null) => {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

export default function Simulator({ initialSimulator, initialQuestions, onFinish, onExit }: SimulatorProps) {
  const { user, supabase } = useSupabase(); 
  
  const [questions, setQuestions] = useState<QuestionType[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<{ [key: number]: Option }>({});
  const [selectedOption, setSelectedOption] = useState<Option | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [score, setScore] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null); // Nuevo estado para errores
  const [answerStatus, setAnswerStatus] = useState<'correct' | 'incorrect' | null>(null);

  useEffect(() => {
    const shuffledQuestions = initialQuestions.map(q => ({
      ...q,
      opciones: [...q.opciones].sort(() => Math.random() - 0.5)
    }));
    setQuestions(shuffledQuestions);
  }, [initialQuestions]);

  const handleOptionSelect = (option: Option) => {
    if (answerStatus || isSubmitting) return;
    setSelectedOption(option);
  };

  const handleVerifyAnswer = () => {
    if (!selectedOption) return;
    const isCorrect = selectedOption.value === questions[currentQuestionIndex].respuesta.value;
    setAnswerStatus(isCorrect ? 'correct' : 'incorrect');
    setUserAnswers({ ...userAnswers, [currentQuestionIndex]: selectedOption });
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setAnswerStatus(null);
      setSelectedOption(null);
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      calculateAndShowResults();
    }
  };
  
  const calculateAndShowResults = async () => {
    setIsSubmitting(true);
    setSaveError(null); // Reseteamos errores previos
    
    // 1. Calcular Nota Localmente
    const finalUserAnswers = { ...userAnswers };
    if (selectedOption && !finalUserAnswers[currentQuestionIndex]) {
        finalUserAnswers[currentQuestionIndex] = selectedOption;
    }

    let correctAnswers = 0;
    questions.forEach((q, index) => {
      if (finalUserAnswers[index]?.value === q.respuesta.value) {
        correctAnswers++;
      }
    });
    
    const finalScore = (correctAnswers / questions.length) * 100;
    const puntajeFinal = Math.round(finalScore);
    setScore(finalScore); // Guardamos la nota en el estado YA MISMO

    // Historial numérico: no se espera la respuesta para no retrasar los resultados.
    if (user?.id) {
      void supabase.from('historial_simuladores').insert({
        user_id: user.id,
        simulador_id: initialSimulator.id,
        puntaje: puntajeFinal,
        total_preguntas: questions.length,
      }).then(({ error }) => {
        if (error) console.error('No se pudo guardar el historial de puntajes:', error);
      });
    }

    // 2. Intentar guardar en Base de Datos (en segundo plano)
    try {
      if (user) {
        const { error } = await supabase.from('resultados').insert({
          simulador_id: initialSimulator.id,
          puntaje: puntajeFinal,
          total_preguntas: questions.length,
          aciertos: correctAnswers,
          usuario_id: user.id,
          email: user.email,
          detalle_respuestas: finalUserAnswers
        });

        if (error) throw error;
      }
    } catch (error: any) {
      console.error('Error guardando:', error);
      // NO bloqueamos al usuario con un alert. Solo guardamos el mensaje para mostrarlo al final.
      setSaveError('Nota: No se pudo guardar en tu historial (Error de conexión/permisos), pero aquí tienes tu resultado.');
    } finally {
      // 3. Pase lo que pase, MOSTRAR RESULTADOS
      onFinish?.(finalScore);
      setIsSubmitting(false);
      setShowResults(true);
    }
  };

  const restartSimulator = () => {
    setCurrentQuestionIndex(0);
    setUserAnswers({});
    setSelectedOption(null);
    setShowResults(false);
    setScore(0);
    setAnswerStatus(null);
    setSaveError(null);
    const shuffledQuestions = initialQuestions.map(q => ({
      ...q,
      opciones: [...q.opciones].sort(() => Math.random() - 0.5)
    }));
    setQuestions(shuffledQuestions);
  };

  if (showResults) {
    const correctCount = Math.round(score / 100 * questions.length);
    return (
      <div className="bg-white p-8 rounded-lg shadow-xl text-center fade-in">
        <h2 className="text-3xl font-bold text-primary mb-4">Resultados Finales</h2>
        <p className="text-xl text-text-secondary mb-4">Tu puntaje es:</p>
        <p className={`text-7xl font-bold mb-2 ${score >= 70 ? 'text-green-500' : 'text-red-500'}`}>
          {score.toFixed(0)}%
        </p>
        <p className="text-lg text-text-secondary mb-8">
          ({correctCount} de {questions.length} respuestas correctas)
        </p>

        {/* Mensaje de error discreto si falló el guardado */}
        {saveError && (
          <div className="mb-6 p-3 bg-orange-50 text-orange-700 text-sm rounded-lg flex items-center justify-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            {saveError}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={restartSimulator}
            className="bg-primary text-white font-bold py-3 px-6 rounded-lg hover:bg-secondary transition-colors inline-flex items-center text-lg"
          >
            <Repeat className="w-5 h-5 mr-2" />
            Volver a intentar
          </button>
          {onExit && (
            <button
              onClick={onExit}
              className="inline-flex items-center gap-2 border border-gray-300 text-gray-700 font-bold py-3 px-6 rounded-lg hover:bg-gray-50 text-lg"
            >
              <ArrowLeft className="w-5 h-5" /> Volver a la lección
            </button>
          )}
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  if (!currentQuestion) {
    return <p className="text-center py-10">Cargando simulador...</p>;
  }

  const youtubeId = getYoutubeId(currentQuestion.youtube_url || null);

  return (
    <div className="bg-white p-4 sm:p-8 rounded-2xl shadow-xl max-w-4xl mx-auto border border-gray-100">
      {/* Barra de Progreso */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-text-secondary mb-2">
           <span>Pregunta {currentQuestionIndex + 1} de {questions.length}</span>
           <span>{Math.round(((currentQuestionIndex + 1) / questions.length) * 100)}% completado</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div 
            className="bg-primary h-3 rounded-full transition-all duration-500 ease-out" 
            style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
          ></div>
        </div>
      </div>

      {/* Enunciado */}
      <div className="mb-8">
        <div className="text-xl md:text-2xl font-semibold text-gray-800 leading-relaxed mb-4">
          <TextoExamen texto={currentQuestion.pregunta || ''} />
        </div>
        {currentQuestion.pregunta_img_url && (
          <div className="relative w-full h-64 md:h-80 max-w-2xl mx-auto rounded-lg overflow-hidden border border-gray-200 bg-gray-50 flex items-center justify-center p-2">
            <img src={currentQuestion.pregunta_img_url} alt="Imagen" className="max-w-full max-h-full object-contain"/>
          </div>
        )}
      </div>

      {/* Opciones */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {currentQuestion.opciones.map((option, i) => {
          const isSelected = selectedOption?.value === option.value;
          let buttonClass = 'bg-gray-50 hover:bg-gray-100 border-gray-200 text-gray-700';
          
          if (answerStatus) {
            const isCorrectAnswer = option.value === currentQuestion.respuesta.value;
            if (isCorrectAnswer) buttonClass = 'bg-green-100 border-green-500 text-green-800 shadow-sm';
            else if (isSelected) buttonClass = 'bg-red-100 border-red-500 text-red-800 opacity-70';
            else buttonClass = 'opacity-50 border-gray-200';
          } else if (isSelected) {
            buttonClass = 'bg-blue-50 border-primary ring-1 ring-primary text-primary shadow-md transform scale-[1.02]';
          }

          return (
            <button
              key={i}
              onClick={() => handleOptionSelect(option)}
              disabled={!!answerStatus || isSubmitting}
              className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 flex items-center min-h-[70px] ${buttonClass}`}
            >
              <span className="font-medium text-lg leading-snug w-full">
                {option.type === 'text' ? <TextoExamen texto={option.value || ''} /> : (
                  <div className="w-full h-40 flex justify-center items-center bg-white rounded border border-gray-200 p-1">
                    <img src={option.value} alt={`Opción ${i+1}`} className="max-h-full max-w-full object-contain" />
                  </div>
                )}
              </span>
              {answerStatus && option.value === currentQuestion.respuesta.value && <CheckCircle className="ml-auto flex-shrink-0 w-6 h-6 text-green-600" />}
               {answerStatus && isSelected && option.value !== currentQuestion.respuesta.value && <XCircle className="ml-auto flex-shrink-0 w-6 h-6 text-red-600" />}
            </button>
          );
        })}
      </div>
      
      {answerStatus && (
        <div className="animate-fade-in mb-8">
          <div className={`p-5 rounded-xl border-l-4 ${answerStatus === 'correct' ? 'bg-green-50 border-green-500' : 'bg-red-50 border-red-500'}`}>
            <h3 className={`font-bold text-lg mb-2 flex items-center ${answerStatus === 'correct' ? 'text-green-800' : 'text-red-800'}`}>
              {answerStatus === 'correct' ? <><CheckCircle className="mr-2 w-6 h-6"/> ¡Respuesta Correcta!</> : <><XCircle className="mr-2 w-6 h-6"/> Respuesta Incorrecta</>}
            </h3>
            {currentQuestion.feedback && <p className="text-gray-700 mt-2 mb-4 leading-relaxed"><TextoExamen texto={currentQuestion.feedback} /></p>}
            {youtubeId && (
              <div className="mt-4">
                <p className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1"><Youtube className="w-4 h-4 text-red-600"/> Explicación en Video</p>
                <a href={currentQuestion.youtube_url!} target="_blank" rel="noopener noreferrer" className="group relative block w-full max-w-md rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all border border-gray-200">
                  <div className="aspect-video relative bg-black">
                    <img src={`https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg`} alt="Video" className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"/>
                    <div className="absolute inset-0 flex items-center justify-center"><div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform"><PlayCircle className="w-8 h-8 text-white ml-1" /></div></div>
                  </div>
                  <div className="bg-white p-3 text-center"><span className="text-blue-600 font-bold text-sm group-hover:underline">Ver explicación completa en YouTube</span></div>
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex justify-center pt-4 border-t border-gray-100">
        {!answerStatus ? (
          <button onClick={handleVerifyAnswer} disabled={!selectedOption || isSubmitting} className="w-full sm:w-auto bg-slate-900 text-white font-bold py-4 px-12 rounded-xl shadow-lg hover:bg-slate-800 hover:shadow-xl transition-all disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed disabled:shadow-none transform active:scale-95">Verificar Respuesta</button>
        ) : (
          <button 
            onClick={handleNextQuestion} 
            disabled={isSubmitting}
            className={`w-full sm:w-auto bg-primary text-white font-bold py-4 px-12 rounded-xl shadow-lg hover:bg-blue-600 hover:shadow-xl transition-all transform active:scale-95 flex items-center justify-center ${isSubmitting ? 'opacity-80 cursor-wait' : ''}`}
          >
            {isSubmitting ? (
              <>Guardando... <Loader2 className="ml-2 w-5 h-5 animate-spin"/></>
            ) : (
              currentQuestionIndex < questions.length - 1 ? 
                <>Siguiente Pregunta <PlayCircle className="ml-2 w-5 h-5"/></> : 
                'Finalizar Simulador'
            )}
          </button>
        )}
      </div>
    </div>
  );
}