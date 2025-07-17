'use client';

import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Youtube, Repeat } from 'lucide-react';
import type { SimulatorType, QuestionType, Option } from '../simulador/[slug]/page';
import Image from 'next/image';
import { useSupabase } from './AuthProvider';
import { InlineMath, BlockMath } from 'react-katex';

interface SimulatorProps {
  initialSimulator: SimulatorType;
  initialQuestions: QuestionType[];
}

// Nueva función para renderizar texto y fórmulas matemáticas con los delimitadores estándar
const renderWithMath = (text: string) => {
  // Expresión regular para encontrar fórmulas LaTeX: \(...\) o \[...\]
  const mathRegex = /(\\\[[\s\S]*?\\\]|\\\(.*?\\\))/g;
  const parts = text.split(mathRegex);

  return parts.map((part, index) => {
    if (part.startsWith('\\[') && part.endsWith('\\]')) {
      // Fórmula en bloque: \[ ... \]
      return <BlockMath key={index} math={part.slice(2, -2)} />;
    } else if (part.startsWith('\\(') && part.endsWith('\\)')) {
      // Fórmula en línea: \( ... \)
      return <InlineMath key={index} math={part.slice(2, -2)} />;
    } else {
      // Texto normal (incluyendo signos de dólar para dinero)
      return <span key={index}>{part}</span>;
    }
  });
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
      await supabase.from('resultados').insert({
        simulador_id: initialSimulator.id,
        puntaje: Math.round(finalScore),
        total_preguntas: questions.length,
        aciertos: correctAnswers,
        usuario_id: user?.id,
        email: user?.email,
      });
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
    const shuffledQuestions = initialQuestions.map(q => ({
      ...q,
      opciones: [...q.opciones].sort(() => Math.random() - 0.5)
    }));
    setQuestions(shuffledQuestions);
  };

  if (showResults) {
    const correctCount = Math.round(score / 100 * questions.length);
    return (
      <div className="bg-white p-8 rounded-lg shadow-xl text-center">
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
    return <p className="text-center">Cargando simulador...</p>;
  }

  return (
    <div className="bg-white p-4 sm:p-8 rounded-2xl shadow-xl max-w-4xl mx-auto">
      <div className="mb-6">
        <p className="text-sm text-text-secondary text-center mb-2">Pregunta {currentQuestionIndex + 1} de {questions.length}</p>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div className="bg-gradient-to-r from-secondary to-primary h-3 rounded-full transition-all duration-500" style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}></div>
        </div>
      </div>

      <div className="mb-6 text-center text-xl md:text-2xl font-semibold">
        {renderWithMath(currentQuestion.pregunta)}
        {currentQuestion.pregunta_img_url && (
          <div className="mt-4 relative w-full h-64 md:h-80 max-w-lg mx-auto">
            <Image src={currentQuestion.pregunta_img_url} alt="Imagen de la pregunta" layout="fill" objectFit="contain" className="rounded-lg" />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {currentQuestion.opciones.map((option, i) => {
          const isSelected = selectedOption?.value === option.value;
          let buttonClass = 'bg-gray-50 hover:bg-gray-100 border-gray-200';
          if (answerStatus) {
            const isCorrectAnswer = option.value === currentQuestion.respuesta.value;
            if (isCorrectAnswer) {
              buttonClass = 'bg-green-100 border-green-500 text-green-800';
            } else if (isSelected) {
              buttonClass = 'bg-red-100 border-red-500 text-red-800';
            }
          } else if (isSelected) {
            buttonClass = 'bg-secondary/20 border-primary scale-105';
          }

          return (
            <button
              key={i}
              onClick={() => handleOptionSelect(option)}
              disabled={!!answerStatus}
              className={`w-full text-left p-4 rounded-lg border-2 transition-all duration-300 flex items-center justify-center min-h-[60px] ${buttonClass}`}
            >
              {option.type === 'text' ? (
                <span className="font-medium text-center">{renderWithMath(option.value)}</span>
              ) : (
                <div className="relative w-full h-32">
                  <Image src={option.value} alt={`Opción ${i+1}`} layout="fill" objectFit="contain" className="rounded-md" />
                </div>
              )}
            </button>
          );
        })}
      </div>
      
      {answerStatus && (
        <div className="fade-in p-4 rounded-lg mb-6 bg-gray-50 border-l-4 border-accent">
          <h3 className="font-bold text-lg mb-2 flex items-center">
            {answerStatus === 'correct' ? 
              <><CheckCircle className="text-green-500 mr-2"/> ¡Respuesta Correcta!</> : 
              <><XCircle className="text-red-500 mr-2"/> Respuesta Incorrecta</>
            }
          </h3>
          {currentQuestion.feedback && <p className="text-text-secondary">{currentQuestion.feedback}</p>}
          {currentQuestion.youtube_url && (
            <a href={currentQuestion.youtube_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center mt-3 text-sm font-semibold text-blue-600 hover:underline">
              <Youtube className="w-5 h-5 mr-2" /> Ver explicación en YouTube
            </a>
          )}
        </div>
      )}

      <div className="flex justify-center mt-4">
        {!answerStatus ? (
          <button
            onClick={handleVerifyAnswer}
            disabled={!selectedOption}
            className="bg-accent text-primary font-bold py-3 px-10 rounded-lg shadow-md hover:opacity-90 transition-all disabled:bg-gray-300 disabled:cursor-not-allowed disabled:shadow-none"
          >
            Verificar
          </button>
        ) : (
          <button
            onClick={handleNextQuestion}
            className="bg-primary text-white font-bold py-3 px-10 rounded-lg shadow-md hover:bg-secondary transition-colors"
          >
            {currentQuestionIndex < questions.length - 1 ? 'Siguiente Pregunta' : 'Finalizar'}
          </button>
        )}
      </div>
    </div>
  );
}