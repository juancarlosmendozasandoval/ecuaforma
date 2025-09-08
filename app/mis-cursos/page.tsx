import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import Link from 'next/link';
import Card from '../components/Card';
import { Lock } from 'lucide-react';

// Esta es la nueva página para mostrar los simuladores privados a los que un usuario tiene acceso.
export default async function MisCursosPage() {
  const cookieStore = cookies();
  const supabase = createServerComponentClient({ cookies: () => cookieStore });
  
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="text-center mt-10 p-8">
        <h1 className="text-2xl font-bold">Inicia Sesión</h1>
        <p className="mt-2 text-gray-600">Por favor, inicia sesión para ver tus cursos privados.</p>
      </div>
    );
  }

  // Obtenemos los IDs de los simuladores a los que el usuario tiene acceso
  const { data: accesos, error: accesosError } = await supabase
    .from('accesos_simuladores')
    .select('simulador_id')
    .eq('usuario_id', user.id);

  if (accesosError || !accesos || accesos.length === 0) {
    return (
       <div className="text-center mt-10 p-8">
        <h1 className="text-2xl font-bold">No tienes cursos privados</h1>
        <p className="mt-2 text-gray-600">Aún no se te ha asignado acceso a ningún simulador privado.</p>
      </div>
    );
  }
  
  const simuladorIds = accesos.map(a => a.simulador_id);

  // Ahora obtenemos los detalles de esos simuladores privados
  const { data: simuladores, error: simuladoresError } = await supabase
    .from('simuladores')
    .select('*')
    .in('id', simuladorIds);

  if (simuladoresError || !simuladores) {
     return <p>Error al cargar tus cursos.</p>;
  }
  
  return (
    <div className="main-container py-10">
      <div className="flex items-center gap-4 mb-6">
        <Lock className="w-8 h-8 text-primary"/>
        <h1 className="text-3xl font-bold">Mis Cursos Privados</h1>
      </div>
      <p className="mb-8 text-text-secondary">Aquí encontrarás todos los simuladores exclusivos a los que se te ha dado acceso.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {simuladores.map(sim => (
          <Card 
            key={sim.slug} 
            title={sim.nombre} 
            href={`/simulador/${sim.slug}`} 
            description={`${sim.institucion} - ${sim.categoria}`}
          />
        ))}
      </div>
    </div>
  );
}