import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import Card from '../components/Card';
import Breadcrumbs from '../components/Breadcrumbs';

// Esta es la página principal que muestra todas las instituciones.
export default async function SimuladoresHome() {
  const cookieStore = cookies();
  const supabase = createServerComponentClient({ cookies: () => cookieStore });
  
  // Solo obtenemos los simuladores que son públicos.
  const { data, error } = await supabase
    .from('simuladores')
    .select('institucion')
    .eq('publico', true);

  if (error || !data) {
    return <p>No se encontraron instituciones.</p>;
  }

  const institutions = Array.from(new Set(data.map(item => item.institucion)));
  const breadcrumbs = [{ label: 'Simuladores', href: '/simuladores', isActive: true }];

  return (
    <div className="main-container py-10">
      <Breadcrumbs items={breadcrumbs} />
      <h1 className="text-3xl font-bold mb-6">Instituciones Públicas</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {institutions.map((inst) => (
          <Card key={inst} title={inst} href={`/simuladores/${inst}`} />
        ))}
      </div>
    </div>
  );
}