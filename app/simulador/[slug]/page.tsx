import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import Simulator from '../../components/Simulator';
import Breadcrumbs from '../../components/Breadcrumbs';
import { notFound } from 'next/navigation';
import Image from 'next/image';

export const revalidate = 60;

export type Option = {
  type: 'text' | 'image';
  value: string;
};

export interface SimulatorType {
  id: string;
  nombre: string;
  slug: string;
  categoria: string;
  institucion: string;
  materia: string;
}

export interface QuestionType {
  id: number;
  simulador_id: string;
  pregunta: string;
  pregunta_img_url: string | null;
  opciones: Option[];
  respuesta: Option;
  feedback: string | null;
  youtube_url: string | null;
}

async function getSimulatorData(slug: string) {
  const supabase = createServerComponentClient({ cookies });
  const { data: simulator, error: simulatorError } = await supabase
    .from('simuladores')
    .select('*')
    .eq('slug', slug)
    .single<SimulatorType>();

  if (simulatorError || !simulator) {
    console.error('Error fetching simulator:', simulatorError);
    return null;
  }

  const { data: questions, error: questionsError } = await supabase
    .from('preguntas')
    .select('*')
    .eq('simulador_id', simulator.id)
    .returns<QuestionType[]>();

  if (questionsError) {
    console.error('Error fetching questions:', questionsError);
    return { simulator, questions: [] };
  }

  return { simulator, questions: questions || [] };
}

export default async function SimulatorPage({ params }: { params: { slug: string } }) {
  const data = await getSimulatorData(params.slug);

  if (!data) {
    notFound();
  }

  const { simulator, questions } = data;

  const breadcrumbs = [
    { label: 'Simuladores', href: '/simuladores' },
    { label: simulator.institucion, href: `/simuladores/${simulator.institucion.toLowerCase()}` },
    { label: simulator.categoria, href: `/simuladores/${simulator.institucion.toLowerCase()}/${simulator.categoria.toLowerCase()}` },
    { label: simulator.materia, href: `/simuladores/${simulator.institucion.toLowerCase()}/${simulator.categoria.toLowerCase()}/${simulator.materia.toLowerCase()}` },
    { label: simulator.nombre }
  ];

  return (
    <div className="main-container">
      <Breadcrumbs items={breadcrumbs} />
      <div className="text-center mb-8">
        <h1 className="text-3xl md:text-4xl font-bold mb-2">{simulator.nombre}</h1>
        <p className="text-text-secondary">Institución: {simulator.institucion} | Categoría: {simulator.categoria} | Materia: {simulator.materia}</p>
      </div>
      
      {questions.length > 0 ? (
        <Simulator initialSimulator={simulator} initialQuestions={questions} />
      ) : (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded-md" role="alert">
          <p className="font-bold">Sin preguntas</p>
          <p>Este simulador aún no tiene preguntas cargadas. Vuelve a intentarlo más tarde.</p>
        </div>
      )}
    </div>
  );
}
