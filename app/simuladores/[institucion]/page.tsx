import { supabase } from '../../../lib/supabaseClient';
import Card from '../../components/Card';
import Breadcrumbs from '../../components/Breadcrumbs';
import { notFound } from 'next/navigation';

// Revalidate the data every 60 seconds
export const revalidate = 60;

async function getCategories(institution: string) {
  const { data, error } = await supabase
    .from('simuladores')
    .select('categoria')
    .ilike('institucion', institution);

  if (error) {
    console.error('Error fetching categories:', error);
    return [];
  }
  if (!data || data.length === 0) {
    return [];
  }
  
  const categories = [...new Set(data.map(item => item.categoria))];
  return categories;
}

export default async function InstitutionPage({ params }: { params: { institucion: string } }) {
  const institution = decodeURIComponent(params.institucion);
  const categories = await getCategories(institution);

  if (categories.length === 0) {
    notFound();
  }
  
  const breadcrumbs = [
    { label: 'Simuladores', href: '/simuladores' },
    { label: institution.charAt(0).toUpperCase() + institution.slice(1) }
  ];

  return (
    <div className="main-container">
      <Breadcrumbs items={breadcrumbs} />
      <h1 className="text-3xl md:text-4xl font-bold mb-8">Elige una Categoría</h1>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {categories.map(cat => (
          <Card 
            key={cat}
            title={cat}
            href={`/simuladores/${institution}/${cat.toLowerCase()}`}
            description={`Pruebas de tipo ${cat}`}
          />
        ))}
      </div>
    </div>
  );
}