import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import Simulator from '../../components/Simulator';
import Breadcrumbs from '../../components/Breadcrumbs';
import { Lock } from 'lucide-react';

export interface SimulatorType {
  id: string;
  nombre: string;
  institucion: string;
  categoria: string;
  materia: string;
  publico: boolean;
}

export interface Option {
  type: 'text' | 'image';
  value: string;
}

export interface QuestionType {
  id: number;
  pregunta: string;
  pregunta_img_url: string | null;
  opciones: Option[];
  respuesta: Option;
  feedback: string | null;
  youtube_url: string | null;
  orden: number; // Agregamos el tipo orden
}

// Esta es la página principal de un simulador individual.
export default async function SimuladorPage({ params }: { params: { slug: string } }) {
  const cookieStore = cookies();
  const supabase = createServerComponentClient({ cookies: () => cookieStore });

  // 1. Obtener los datos del simulador
  const { data: simulatorData, error: simulatorError } = await supabase
    .from('simuladores')
    .select('*')
    .eq('slug', params.slug)
    .single();

  if (simulatorError || !simulatorData) {
    return <p className="text-center mt-10">No se encontró el simulador.</p>;
  }
  
  // 2. Comprobar si el usuario ha iniciado sesión
  const { data: { session } } = await supabase.auth.getSession();

  // 3. Si el simulador NO es público, comprobar permisos
  if (!simulatorData.publico) {
    if (!session) {
      return (
        <div className="text-center mt-10 p-8 bg-yellow-50 border-l-4 border-yellow-400">
           <Lock className="mx-auto mb-4 h-12 w-12 text-yellow-500" />
          <h1 className="text-2xl font-bold">Contenido Privado</h1>
          <p className="mt-2 text-gray-600">Este es un simulador privado. Por favor, inicia sesión para comprobar si tienes acceso.</p>
        </div>
      );
    }

    // El usuario ha iniciado sesión, ahora comprobamos si tiene acceso en la tabla `accesos_simuladores`
    const { data: accessData, error: accessError } = await supabase
      .from('accesos_simuladores')
      .select('*')
      .eq('simulador_id', simulatorData.id)
      .eq('usuario_id', session.user.id)
      .maybeSingle();

    if (accessError || !accessData) {
       return (
        <div className="text-center mt-10 p-8 bg-red-50 border-l-4 border-red-400">
           <Lock className="mx-auto mb-4 h-12 w-12 text-red-500" />
          <h1 className="text-2xl font-bold">Acceso Denegado</h1>
          <p className="mt-2 text-gray-600">No tienes permiso para acceder a este simulador privado.</p>
        </div>
      );
    }
  }

  // 4. Si el simulador es público o el usuario tiene acceso, obtener las preguntas
  // CORRECCIÓN: Ahora ordenamos por 'orden' (tu orden manual) y luego por 'id'
  const { data: questionsData, error: questionsError } = await supabase
    .from('preguntas')
    .select('*')
    .eq('simulador_id', simulatorData.id)
    .order('orden', { ascending: true }) // <--- ESTO FALTABA
    .order('id', { ascending: true });

  if (questionsError || !questionsData) {
    return <p className="text-center mt-10">No se pudieron cargar las preguntas.</p>;
  }

  const breadcrumbs = [
    { label: 'Simuladores', href: '/simuladores' },
    { label: simulatorData.institucion, href: `/simuladores/${simulatorData.institucion}` },
    { label: simulatorData.categoria, href: `/simuladores/${simulatorData.institucion}/${simulatorData.categoria}` },
    { label: simulatorData.materia, href: `/simuladores/${simulatorData.institucion}/${simulatorData.categoria}/${simulatorData.materia}` },
    { label: simulatorData.nombre, href: `/simulador/${params.slug}`, isActive: true },
  ];

  return (
    <div className="main-container py-10">
      <Breadcrumbs items={breadcrumbs} />
      <div className="text-center mb-8">
        <h1 className="text-4xl font-extrabold text-primary">{simulatorData.nombre}</h1>
        <p className="text-text-secondary mt-2">
          Institución: {simulatorData.institucion} | Categoría: {simulatorData.categoria} | Materia: {simulatorData.materia}
        </p>
      </div>
      <Simulator initialSimulator={simulatorData} initialQuestions={questionsData} />
    </div>
  );
}