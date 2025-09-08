import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import Card from '../../../components/Card';
import Breadcrumbs from '../../../components/Breadcrumbs';

// Muestra las materias visibles para una categoría específica.
export default async function CategoriaPage({ params }: { params: { institucion: string, categoria: string } }) {
  const cookieStore = cookies();
  const supabase = createServerComponentClient({ cookies: () => cookieStore });
  const { data: { user } } = await supabase.auth.getUser();
  
  let query = supabase.from('simuladores').select('materia')
    .eq('institucion', params.institucion)
    .eq('categoria', params.categoria);

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
    return <p>No se encontraron materias para esta categoría.</p>;
  }

  const materias = Array.from(new Set(data.map(item => item.materia)));
  const breadcrumbs = [
    { label: 'Simuladores', href: '/simuladores' },
    { label: params.institucion, href: `/simuladores/${params.institucion}` },
    { label: params.categoria, href: `/simuladores/${params.institucion}/${params.categoria}`, isActive: true }
  ];
  
  return (
    <div className="main-container py-10">
      <Breadcrumbs items={breadcrumbs} />
      <h1 className="text-3xl font-bold mb-6">Materias en {decodeURIComponent(params.categoria)}</h1>
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {materias.map(mat => (
          <Card key={mat} title={mat} href={`/simuladores/${params.institucion}/${params.categoria}/${mat}`} />
        ))}
      </div>
    </div>
  );
}