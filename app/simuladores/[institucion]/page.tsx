import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import Card from '../../components/Card';
import Breadcrumbs from '../../components/Breadcrumbs';

// Muestra las categorías visibles para una institución específica.
export default async function InstitucionPage({ params }: { params: { institucion: string } }) {
  const cookieStore = cookies();
  const supabase = createServerComponentClient({ cookies: () => cookieStore });
  const { data: { user } } = await supabase.auth.getUser();

  // Usamos la nueva función y filtramos por institución.
  const { data, error } = await supabase
    .rpc('get_visible_simulators', { p_user_id: user?.id })
    .eq('institucion', params.institucion)
    .select('categoria');
    
  if (error || !data) {
    return <p>No se encontraron categorías para esta institución.</p>;
  }
  
  const categories = Array.from(new Set(data.map(item => item.categoria)));
  const breadcrumbs = [
    { label: 'Simuladores', href: '/simuladores' },
    { label: params.institucion, href: `/simuladores/${params.institucion}`, isActive: true }
  ];

  return (
    <div className="main-container py-10">
      <Breadcrumbs items={breadcrumbs} />
      <h1 className="text-3xl font-bold mb-6">Categorías en {decodeURIComponent(params.institucion)}</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {categories.map(cat => (
          <Card key={cat} title={cat} href={`/simuladores/${params.institucion}/${cat}`} />
        ))}
      </div>
    </div>
  );
}