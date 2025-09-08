import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import Card from '../../../../components/Card';
import Breadcrumbs from '../../../../components/Breadcrumbs';

// Muestra los simuladores visibles para una materia específica.
export default async function MateriaPage({ params }: { params: { institucion: string, categoria: string, materia: string } }) {
  const cookieStore = cookies();
  const supabase = createServerComponentClient({ cookies: () => cookieStore });
  const { data: { user } } = await supabase.auth.getUser();

  // Usamos la nueva función y filtramos.
  const { data, error } = await supabase
    .rpc('get_visible_simulators', { p_user_id: user?.id })
    .eq('institucion', params.institucion)
    .eq('categoria', params.categoria)
    .eq('materia', params.materia)
    .select('nombre, slug');

  if (error || !data) {
    return <p>No se encontraron simuladores para esta materia.</p>;
  }
  
  const breadcrumbs = [
    { label: 'Simuladores', href: '/simuladores' },
    { label: params.institucion, href: `/simuladores/${params.institucion}` },
    { label: params.categoria, href: `/simuladores/${params.institucion}/${params.categoria}` },
    { label: params.materia, href: `/simuladores/${params.institucion}/${params.categoria}/${params.materia}`, isActive: true }
  ];
  
  return (
    <div className="main-container py-10">
       <Breadcrumbs items={breadcrumbs} />
      <h1 className="text-3xl font-bold mb-6">Simuladores de {decodeURIComponent(params.materia)}</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {data.map(sim => (
          <Card key={sim.slug} title={sim.nombre} href={`/simulador/${sim.slug}`} />
        ))}
      </div>
    </div>
  );
}
