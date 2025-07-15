import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import Card from '../../../../components/Card';
import Breadcrumbs from '../../../../components/Breadcrumbs';
import { notFound } from 'next/navigation';

export const revalidate = 60;

async function getSimulators(institution: string, category: string, materia: string) {
  const supabase = createServerComponentClient({ cookies });
  const { data, error } = await supabase
    .from('simuladores')
    .select('nombre, slug')
    .ilike('institucion', institution)
    .ilike('categoria', category)
    .ilike('materia', materia);

  if (error) {
    console.error('Error fetching simulators:', error);
    return [];
  }
  return data || [];
}

export default async function MateriaPage({ params }: { params: { institucion: string, categoria: string, materia: string } }) {
  const institution = decodeURIComponent(params.institucion);
  const category = decodeURIComponent(params.categoria);
  const materia = decodeURIComponent(params.materia);
  const simulators = await getSimulators(institution, category, materia);

  if (simulators.length === 0) {
    notFound();
  }

  const breadcrumbs = [
    { label: 'Simuladores', href: '/simuladores' },
    { label: institution.charAt(0).toUpperCase() + institution.slice(1), href: `/simuladores/${institution}` },
    { label: category.charAt(0).toUpperCase() + category.slice(1), href: `/simuladores/${institution}/${category}` },
    { label: materia.charAt(0).toUpperCase() + materia.slice(1) }
  ];

  return (
    <div className="main-container">
      <Breadcrumbs items={breadcrumbs} />
      <h1 className="text-3xl md:text-4xl font-bold mb-8">Elige un Simulador</h1>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {simulators.map(sim => (
          <Card 
            key={sim.slug}
            title={sim.nombre}
            href={`/simulador/${sim.slug}`}
            description="¡Haz clic para empezar!"
          />
        ))}
      </div>
    </div>
  );
}
