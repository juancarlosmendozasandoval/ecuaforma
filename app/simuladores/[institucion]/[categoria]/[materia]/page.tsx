import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import Card from '../../../../components/Card';
import Breadcrumbs from '../../../../components/Breadcrumbs';

// Muestra los simuladores visibles para una materia específica.
export default async function MateriaPage({ params }: { params: { institucion: string, categoria: string, materia: string } }) {
  const cookieStore = cookies();
  const supabase = createServerComponentClient({ cookies: () => cookieStore });
  const { data: { user } } = await supabase.auth.getUser();

  // Solución: Decodificar todos los parámetros de la URL.
  const decodedInstitucion = decodeURIComponent(params.institucion);
  const decodedCategoria = decodeURIComponent(params.categoria);
  const decodedMateria = decodeURIComponent(params.materia);

  let query = supabase.from('simuladores').select('nombre, slug')
    .eq('institucion', decodedInstitucion)
    .eq('categoria', decodedCategoria)
    .eq('materia', decodedMateria);
  
  if (!user) {
    query = query.eq('publico', true);
  } else {
    const { data: accessData } = await supabase
      .from('accesos_simuladores')
      .select('simulador_id')
      .eq('usuario_id', user.id);
    
    const accessibleIds = accessData ? accessData.map(a => a.simulador_id) : [];

    if (accessibleIds.length > 0) {
      query = query.or(`publico.eq.true,id.in.(${accessibleIds.join(',')})`);
    } else {
      query = query.eq('publico', true);
    }
  }

  const { data, error } = await query;

  if (error || !data) {
    return <p>No se encontraron simuladores para esta materia.</p>;
  }
  
  const breadcrumbs = [
    { label: 'Simuladores', href: '/simuladores' },
    { label: decodedInstitucion, href: `/simuladores/${params.institucion}` },
    { label: decodedCategoria, href: `/simuladores/${params.institucion}/${params.categoria}` },
    { label: decodedMateria, href: `/simuladores/${params.institucion}/${params.categoria}/${params.materia}`, isActive: true }
  ];
  
  return (
    <div className="main-container py-10">
       <Breadcrumbs items={breadcrumbs} />
      <h1 className="text-3xl font-bold mb-6">Simuladores de {decodedMateria}</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {data.map(sim => (
          <Card key={sim.slug} title={sim.nombre} href={`/simulador/${sim.slug}`} />
        ))}
      </div>
    </div>
  );
}