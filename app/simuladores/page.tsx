import { supabase } from '../../lib/supabaseClient';
import Card from '../components/Card';
import Breadcrumbs from '../components/Breadcrumbs';

// Revalidate the data every 60 seconds
export const revalidate = 60;

async function getInstitutions() {
  const { data, error } = await supabase
    .from('simuladores')
    .select('institucion');

  if (error) {
    console.error('Error fetching institutions:', error);
    return [];
  }
  
  const institutions = [...new Set(data.map(item => item.institucion))];
  return institutions;
}

export default async function SimuladoresPage() {
  const institutions = await getInstitutions();

  const breadcrumbs = [
    { label: 'Simuladores' }
  ];

  return (
    <div className="main-container">
      <Breadcrumbs items={breadcrumbs} />
      <h1 className="text-3xl md:text-4xl font-bold mb-8">Elige una Institución</h1>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {institutions.map(inst => (
          <Card 
            key={inst}
            title={inst}
            href={`/simuladores/${inst.toLowerCase()}`}
            description={`Simuladores para ${inst}`}
          />
        ))}
        {institutions.length === 0 && (
          <p className="text-text-secondary">No hay instituciones disponibles en este momento.</p>
        )}
      </div>
    </div>
  );
}