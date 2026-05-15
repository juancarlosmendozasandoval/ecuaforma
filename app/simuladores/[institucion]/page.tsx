import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import Card from '../../components/Card';
import Breadcrumbs from '../../components/Breadcrumbs';

// Muestra las categorías visibles para una institución específica.
export default async function InstitucionPage({ params }: { params: { institucion: string } }) {
  const cookieStore = cookies();
  const supabase = createServerComponentClient({ cookies: () => cookieStore });
  const { data: { user } } = await supabase.auth.getUser();

  // 1. Decodificar por si acaso alguien escribe la URL con %C3%AD
  const decodedInstitucion = decodeURIComponent(params.institucion);

  // 2. Diccionario traductor: convierte la URL limpia al nombre exacto de tu Base de Datos
  const mapping: { [key: string]: string } = {
    'fae': 'FAE',
    'armada': 'Armada',
    'ejercito': 'Ejército',
    'ejército': 'Ejército',
    'policia': 'Policía',
    'policía': 'Policía'
  };

  // 3. Obtenemos el nombre real (con tilde) para buscar en Supabase
  const nombreReal = mapping[decodedInstitucion.toLowerCase()] || decodedInstitucion;

  // 4. Usamos el 'nombreReal' en la consulta en lugar de 'decodedInstitucion'
  let query = supabase.from('simuladores').select('categoria').eq('institucion', nombreReal);

  // --- Lógica original de permisos (intacta) ---
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
    return <p>No se encontraron categorías para esta institución.</p>;
  }
  
  const categories = Array.from(new Set(data.map(item => item.categoria)));
  const breadcrumbs = [
    { label: 'Simuladores', href: '/simuladores' },
    { label: nombreReal, href: `/simuladores/${params.institucion}`, isActive: true }
  ];

  return (
    <div className="main-container py-10">
      <Breadcrumbs items={breadcrumbs} />
      <h1 className="text-3xl font-bold mb-6">Categorías en {nombreReal}</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {categories.map(cat => (
          <Card key={cat} title={cat} href={`/simuladores/${params.institucion}/${cat}`} />
        ))}
      </div>
    </div>
  );
}