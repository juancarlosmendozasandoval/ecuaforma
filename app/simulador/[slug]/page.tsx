import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import Simulator from '../../components/Simulator';
import Breadcrumbs from '../../components/Breadcrumbs';
import Link from 'next/link';
import { Lock, CreditCard, MessageCircle, CheckCircle } from 'lucide-react';

export interface SimulatorType {
  id: string;
  nombre: string;
  institucion: string;
  categoria: string;
  materia: string;
  publico: boolean;
  es_pago?: boolean;
  precio?: number;
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
  orden: number;
}

export default async function SimuladorPage({ params }: { params: { slug: string } }) {
  const cookieStore = cookies();
  const supabase = createServerComponentClient({ cookies: () => cookieStore });

  // 1. Obtener datos del simulador
  const { data: simulatorData, error: simulatorError } = await supabase
    .from('simuladores')
    .select('*')
    .eq('slug', params.slug)
    .single();

  if (simulatorError || !simulatorData) return <p className="text-center mt-10">No se encontró el simulador.</p>;
  
  // 2. Comprobar sesión y acceso
  const { data: { session } } = await supabase.auth.getSession();
  let tieneAcceso = simulatorData.publico; // Si es público, tiene acceso por defecto

  if (!tieneAcceso && session) {
    const { data: accessData } = await supabase
      .from('accesos_simuladores')
      .select('id')
      .eq('simulador_id', simulatorData.id)
      .eq('usuario_id', session.user.id)
      .single();

    if (accessData) tieneAcceso = true;
  }

  const breadcrumbs = [
    { label: 'Simuladores', href: '/simuladores' },
    { label: simulatorData.institucion, href: `/simuladores/${simulatorData.institucion}` },
    { label: simulatorData.categoria, href: `/simuladores/${simulatorData.institucion}/${simulatorData.categoria}` },
    { label: simulatorData.materia, href: `/simuladores/${simulatorData.institucion}/${simulatorData.categoria}/${simulatorData.materia}` },
    { label: simulatorData.nombre, href: `/simulador/${params.slug}`, isActive: true },
  ];

  const mensajeWhatsApp = `Hola Ecuaforma, quiero adquirir el simulador: *${simulatorData.nombre}*. Mi correo es: ${session?.user?.email || '[Mi Correo]'}`;
  const linkWhatsApp = `https://wa.me/593992893010?text=${encodeURIComponent(mensajeWhatsApp)}`;

  // 3. SI NO TIENE ACCESO -> Mostrar la Vitrina de Venta
  if (!tieneAcceso) {
    return (
      <div className="main-container py-10 min-h-screen bg-gray-50/50">
        <Breadcrumbs items={breadcrumbs} />
        
        <div className="max-w-2xl mx-auto mt-10 bg-white p-8 md:p-10 rounded-3xl shadow-xl border border-gray-100 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 to-indigo-600"></div>
          
          <Lock className="w-16 h-16 text-indigo-200 mx-auto mb-6" />
          <h1 className="text-3xl font-black text-gray-900 mb-2">{simulatorData.nombre}</h1>
          <p className="text-gray-500 mb-8 max-w-md mx-auto">Este simulador es privado. Para acceder a sus preguntas, necesitas inscribirte o adquirir el acceso.</p>
          
          <div className="bg-gray-50 p-6 rounded-2xl mb-8 border border-gray-200">
            <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Precio del Simulador</span>
            {simulatorData.es_pago ? (
              <div className="flex items-end justify-center gap-1 text-emerald-600">
                <span className="text-2xl font-bold">$</span>
                <span className="text-5xl font-black">{simulatorData.precio}</span>
                <span className="text-lg font-medium mb-1 text-gray-500">USD</span>
              </div>
            ) : (
              <span className="text-4xl font-black text-blue-600">GRATIS</span>
            )}
          </div>

          {!session ? (
            <Link href="/auth" className="inline-block w-full sm:w-auto bg-slate-900 text-white px-10 py-4 rounded-xl font-bold shadow-md hover:bg-slate-800 transition-colors">
              Inicia Sesión para Acceder
            </Link>
          ) : simulatorData.es_pago ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md mx-auto">
              <button className="w-full bg-[#f37021] text-white py-3.5 rounded-xl font-bold shadow-md hover:bg-[#d9611b] transition-colors flex items-center justify-center gap-2">
                <CreditCard className="w-5 h-5"/> Pagar Tarjeta
              </button>
              <a href={linkWhatsApp} target="_blank" rel="noopener noreferrer" className="w-full bg-emerald-500 text-white py-3.5 rounded-xl font-bold shadow-md hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2">
                <MessageCircle className="w-5 h-5"/> Transferencia
              </a>
            </div>
          ) : (
            <button className="inline-block w-full sm:w-auto bg-blue-600 text-white px-10 py-4 rounded-xl font-bold shadow-md hover:bg-blue-700 transition-colors">
              Obtener Acceso Gratis
            </button>
          )}
        </div>
      </div>
    );
  }

  // 4. SI TIENE ACCESO -> Cargar preguntas y renderizar el simulador
  const { data: questionsData } = await supabase
    .from('preguntas')
    .select('*')
    .eq('simulador_id', simulatorData.id)
    .order('orden', { ascending: true })
    .order('id', { ascending: true });

  return (
    <div className="main-container py-10">
      <Breadcrumbs items={breadcrumbs} />
      <div className="text-center mb-8">
        <h1 className="text-4xl font-extrabold text-primary">{simulatorData.nombre}</h1>
        <p className="text-text-secondary mt-2">
          Institución: {simulatorData.institucion} | Categoría: {simulatorData.categoria} | Materia: {simulatorData.materia}
        </p>
      </div>
      <Simulator initialSimulator={simulatorData} initialQuestions={questionsData || []} />
    </div>
  );
}