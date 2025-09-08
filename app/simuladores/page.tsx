import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import Card from '../components/Card';
import Breadcrumbs from '../components/Breadcrumbs';

// Esta página ahora mostrará todas las instituciones visibles para el usuario.
export default async function SimuladoresHome() {
  const cookieStore = cookies();
  const supabase = createServerComponentClient({ cookies: () => cookieStore });
  const { data: { user } } = await supabase.auth.getUser();
  
  // Usamos la nueva función para obtener todos los simuladores visibles.
  const { data, error } = await supabase
    .rpc('get_visible_simulators', { p_user_id: user?.id })
    .select('institucion');

  if (error || !data) {
    return <p>No se encontraron instituciones.</p>;
  }

  const institutions = Array.from(new Set(data.map(item => item.institucion)));
  const breadcrumbs = [{ label: 'Simuladores', href: '/simuladores', isActive: true }];

  return (
    <div className="main-container py-10">
      <Breadcrumbs items={breadcrumbs} />
      <h1 className="text-3xl font-bold mb-6">Instituciones Disponibles</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {institutions.map((inst) => (
          <Card key={inst} title={inst} href={`/simuladores/${inst}`} />
        ))}
      </div>
    </div>
  );
}
