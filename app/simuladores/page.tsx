import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import Card from '../components/Card';
import Breadcrumbs from '../components/Breadcrumbs';

// Esta página ahora mostrará todas las instituciones visibles para el usuario.
export default async function SimuladoresHome() {
  const cookieStore = cookies();
  const supabase = createServerComponentClient({ cookies: () => cookieStore });
  const { data: { user } } = await supabase.auth.getUser();

  let query = supabase.from('simuladores').select('institucion');

  // Si el usuario no ha iniciado sesión, solo mostramos los públicos.
  if (!user) {
    query = query.eq('publico', true);
  } else {
    // Si ha iniciado sesión, obtenemos sus accesos privados.
    const { data: accessData } = await supabase
      .from('accesos_simuladores')
      .select('simulador_id')
      .eq('usuario_id', user.id);
    
    const accessibleIds = accessData ? accessData.map(a => a.simulador_id) : [];

    if (accessibleIds.length > 0) {
      // Mostramos los que son públicos O los que están en su lista de acceso.
      query = query.or(`publico.eq.true,id.in.(${accessibleIds.join(',')})`);
    } else {
      // Si no tiene accesos, solo ve los públicos.
      query = query.eq('publico', true);
    }
  }
  
  const { data, error } = await query;

  if (error || !data) {
    return <p>No se encontraron instituciones.</p>;
  }

  const institutions = Array.from(new Set(data.map(item => item.institucion)));
  const breadcrumbs = [{ label: 'Simuladores', href: '/simuladores', isActive: true }];

  return (
    <div className="main-container py-10">
      <Breadcrumbs items={breadcrumbs} />
      <h1 className="text-3xl font-bold mb-6">Instituciones Disponibles</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {institutions.map((inst) => (
          <Card key={inst} title={inst} href={`/simuladores/${inst}`} />
        ))}
      </div>
    </div>
  );
}