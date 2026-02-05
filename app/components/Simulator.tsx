'use client';

import { useState, useEffect, Fragment } from 'react';
import { CheckCircle, XCircle, Youtube, Repeat, PlayCircle } from 'lucide-react';
import type { SimulatorType, QuestionType, Option } from '../simulador/[slug]/page';
import { useSupabase } from './AuthProvider';
import { InlineMath, BlockMath } from 'react-katex';

interface SimulatorProps {
  initialSimulator: SimulatorType;
  initialQuestions: QuestionType[];
}

// Función recursiva para renderizar formato (negrita, fórmulas, etc.)
const renderFormattedText = (text: string): (string | JSX.Element)[] => {
  if (!text) return [];
  const regex = /(\\\[[\s\S]*?\\\]|\\\(.*?\\\)|<u>[\s\S]*?<\/u>)/g;
  const parts = text.split(regex);

  return parts.filter(Boolean).map((part, index) => {
    if (part.startsWith('\\[') && part.endsWith('\\]')) {
      return <BlockMath key={index} math={part.slice(2, -2)} />;
    }
    if (part.startsWith('\\(') && part.endsWith('\\)')) {
      return <InlineMath key={index} math={part.slice(2, -2)} />;
    }
    if (part.startsWith('<u>') && part.endsWith('</u>')) {
      return <u key={index}>{renderFormattedText(part.slice(3, -3))}</u>;
    }
    return part;
  });
};

// Función auxiliar para extraer ID de YouTube
const getYoutubeId = (url: string | null) => {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

export default function Simulator({ initialSimulator, initialQuestions }: SimulatorProps) {
  const { user, supabase } = useSupabase(); 
  
  const [questions, setQuestions] = useState<QuestionType[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<{ [key: number]: Option }>({});
  const [selectedOption, setSelectedOption] = useState<Option | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [score, setScore] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [answerStatus, setAnswerStatus] = useState<'correct' | 'incorrect' | null>(null);

  useEffect(() => {
    // Mezclar opciones al cargar
    const shuffledQuestions = initialQuestions.map(q => ({
      ...q,
      opciones: [...q.opciones].sort(() => Math.random() - 0.5)
    }));
    setQuestions(shuffledQuestions);
  }, [initialQuestions]);

  const handleOptionSelect = (option: Option) => {
    if (answerStatus) return;
    setSelectedOption(option);
  };

  const handleVerifyAnswer = () => {
    if (!selectedOption) return;
    const isCorrect = selectedOption.value === questions[currentQuestionIndex].respuesta.value;
    setAnswerStatus(isCorrect ? 'correct' : 'incorrect');
    setUserAnswers({ ...userAnswers, [currentQuestionIndex]: selectedOption });
  };

  const handleNextQuestion = () => {
    setAnswerStatus(null);
    setSelectedOption(null);
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      calculateAndShowResults();
    }
  };
  
  const calculateAndShowResults = async () => {
    setIsSubmitting(true);
    
    // Asegurar que la última respuesta se cuente si no se ha guardado
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
    setScore(finalScore);
    setShowResults(true);

    try {
      if (user) {
        await supabase.from('resultados').insert({
          simulador_id: initialSimulator.id,
          puntaje: Math.round(finalScore),
          total_preguntas: questions.length,
          aciertos: correctAnswers,
          usuario_id: user.id,
          email: user.email,
        });
      }
    } catch (error) {
      console.error('Error saving results:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const restartSimulator = () => {
    setCurrentQuestionIndex(0);
    setUserAnswers({});
    setSelectedOption(null);
    setShowResults(false);
    setScore(0);
    setAnswerStatus(null);
    // Volver a mezclar preguntas al reiniciar
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
        <button
          onClick={restartSimulator}
          className="bg-primary text-white font-bold py-3 px-6 rounded-lg hover:bg-secondary transition-colors inline-flex items-center text-lg"
        >
          <Repeat className="w-5 h-5 mr-2" />
          Volver a intentar
        </button>
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
          {renderFormattedText(currentQuestion.pregunta)}
        </div>
        
        {/* Imagen de la pregunta (si existe) */}
        {currentQuestion.pregunta_img_url && (
          <div className="relative w-full h-64 md:h-80 max-w-2xl mx-auto rounded-lg overflow-hidden border border-gray-200 bg-gray-50 flex items-center justify-center p-2">
            <img 
              src={currentQuestion.pregunta_img_url} 
              alt="Imagen de la pregunta" 
              className="max-w-full max-h-full object-contain"
            />
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
            if (isCorrectAnswer) {
              buttonClass = 'bg-green-100 border-green-500 text-green-800 shadow-sm';
            } else if (isSelected) {
              buttonClass = 'bg-red-100 border-red-500 text-red-800 opacity-70';
            } else {
              buttonClass = 'opacity-50 border-gray-200';
            }
          } else if (isSelected) {
            buttonClass = 'bg-blue-50 border-primary ring-1 ring-primary text-primary shadow-md transform scale-[1.02]';
          }

          return (
            <button
              key={i}
              onClick={() => handleOptionSelect(option)}
              disabled={!!answerStatus}
              className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 flex items-center min-h-[70px] ${buttonClass}`}
            >
              {/* SE ELIMINÓ EL DIV CON LA LETRA EN CÍRCULO AQUÍ */}
              <span className="font-medium text-lg leading-snug w-full">
                {option.type === 'text' ? (
                  renderFormattedText(option.value)
                ) : (
                  <div className="w-full h-40 flex justify-center items-center bg-white rounded border border-gray-200 p-1">
                    <img 
                      src={option.value} 
                      alt={`Opción ${i+1}`} 
                      className="max-h-full max-w-full object-contain" 
                    />
                  </div>
                )}
              </span>
              {answerStatus && option.value === currentQuestion.respuesta.value && (
                <CheckCircle className="ml-auto flex-shrink-0 w-6 h-6 text-green-600" />
              )}
               {answerStatus && isSelected && option.value !== currentQuestion.respuesta.value && (
                <XCircle className="ml-auto flex-shrink-0 w-6 h-6 text-red-600" />
              )}
            </button>
          );
        })}
      </div>
      
      {/* Sección de Retroalimentación y Video */}
      {answerStatus && (
        <div className="animate-fade-in mb-8">
          <div className={`p-5 rounded-xl border-l-4 ${answerStatus === 'correct' ? 'bg-green-50 border-green-500' : 'bg-red-50 border-red-500'}`}>
            <h3 className={`font-bold text-lg mb-2 flex items-center ${answerStatus === 'correct' ? 'text-green-800' : 'text-red-800'}`}>
              {answerStatus === 'correct' ? 
                <><CheckCircle className="mr-2 w-6 h-6"/> ¡Respuesta Correcta!</> : 
                <><XCircle className="mr-2 w-6 h-6"/> Respuesta Incorrecta</>
              }
            </h3>
            
            {currentQuestion.feedback && (
              <p className="text-gray-700 mt-2 mb-4 leading-relaxed">
                {currentQuestion.feedback}
              </p>
            )}

            {youtubeId && (
              <div className="mt-4">
                <p className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Youtube className="w-4 h-4 text-red-600"/> Explicación en Video
                </p>
                <a 
                  href={currentQuestion.youtube_url!} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="group relative block w-full max-w-md rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all border border-gray-200"
                >
                  <div className="aspect-video relative bg-black">
                    <img 
                      src={`https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg`} 
                      alt="Ver explicación en video"
                      className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                        <PlayCircle className="w-8 h-8 text-white ml-1" />
                      </div>
                    </div>
                  </div>
                  <div className="bg-white p-3 text-center">
                    <span className="text-blue-600 font-bold text-sm group-hover:underline">
                      Ver explicación completa en YouTube
                    </span>
                  </div>
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex justify-center pt-4 border-t border-gray-100">
        {!answerStatus ? (
          <button
            onClick={handleVerifyAnswer}
            disabled={!selectedOption}
            className="w-full sm:w-auto bg-slate-900 text-white font-bold py-4 px-12 rounded-xl shadow-lg hover:bg-slate-800 hover:shadow-xl transition-all disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed disabled:shadow-none transform active:scale-95"
          >
            Verificar Respuesta
          </button>
        ) : (
          <button
            onClick={handleNextQuestion}
            className="w-full sm:w-auto bg-primary text-white font-bold py-4 px-12 rounded-xl shadow-lg hover:bg-blue-600 hover:shadow-xl transition-all transform active:scale-95 flex items-center justify-center"
          >
            {currentQuestionIndex < questions.length - 1 ? (
              <>Siguiente Pregunta <PlayCircle className="ml-2 w-5 h-5"/></>
            ) : (
              'Finalizar Simulador'
            )}
          </button>
        )}
      </div>
    </div>
  );
}