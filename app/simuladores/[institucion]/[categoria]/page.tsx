import { supabase } from '../../../../lib/supabaseClient';
import Card from '../../../components/Card';
import Breadcrumbs from '../../../components/Breadcrumbs';
import { notFound } from 'next/navigation';

export const revalidate = 60;

async function getMaterias(institution: string, category: string) {
  const { data, error } = await supabase
    .from('simuladores')
    .select('materia')
    .ilike('institucion', institution)
    .ilike('categoria', category);

  if (error) {
    console.error('Error fetching materias:', error);
    return [];
  }
  if (!data || data.length === 0) {
    return [];
  }
  
  // Usamos Array.from() para asegurar la compatibilidad con TypeScript
  const materias = Array.from(new Set(data.map(item => item.materia)));
  return materias;
}

export default async function CategoryPage({ params }: { params: { institucion: string, categoria: string } }) {
  const institution = decodeURIComponent(params.institucion);
  const category = decodeURIComponent(params.categoria);
  const materias = await getMaterias(institution, category);

  if (materias.length === 0) {
    notFound();
  }

  const breadcrumbs = [
    { label: 'Simuladores', href: '/simuladores' },
    { label: institution.charAt(0).toUpperCase() + institution.slice(1), href: `/simuladores/${institution}` },
    { label: category.charAt(0).toUpperCase() + category.slice(1) }
  ];

  return (
    <div className="main-container">
      <Breadcrumbs items={breadcrumbs} />
      <h1 className="text-3xl md:text-4xl font-bold mb-8">Elige una Materia</h1>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {materias.map(mat => (
          <Card 
            key={mat}
            title={mat}
            href={`/simuladores/${institution}/${category}/${mat.toLowerCase()}`}
            description={`Simuladores de ${mat}`}
          />
        ))}
      </div>
    </div>
  );
}