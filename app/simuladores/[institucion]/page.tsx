import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import Card from '../../components/Card';
import Breadcrumbs from '../../components/Breadcrumbs';
import {
  cargarMateriasCatalogo,
  filtroVisibilidad,
  nombreInstitucion,
  simuladoresAccesibles,
} from '@/lib/simuladores/catalogo';

export const dynamic = 'force-dynamic';

/** Materias (relacionales) con simuladores visibles en una institución. */
export default async function InstitucionPage({ params }: { params: { institucion: string } }) {
  const cookieStore = cookies();
  const supabase = createServerComponentClient({ cookies: () => cookieStore });
  const { data: { user } } = await supabase.auth.getUser();
  const institucion = nombreInstitucion(params.institucion);

  const [{ data, error }, materias] = await Promise.all([
    supabase
      .from('simuladores')
      .select('materia_id')
      .eq('institucion', institucion)
      .eq('is_deleted', false)
      .not('materia_id', 'is', null)
      .or(filtroVisibilidad(await simuladoresAccesibles(supabase, user?.id))),
    cargarMateriasCatalogo(),
  ]);

  if (error || !data) {
    return <p className="main-container py-10">No se encontraron materias para esta institución.</p>;
  }

  const conteo = new Map<string, number>();
  for (const fila of data as { materia_id: string }[]) {
    conteo.set(fila.materia_id, (conteo.get(fila.materia_id) || 0) + 1);
  }
  const visibles = materias.filter((materia) => conteo.has(materia.id));

  const breadcrumbs = [
    { label: 'Simuladores', href: '/simuladores' },
    { label: institucion, href: `/simuladores/${params.institucion}`, isActive: true },
  ];

  return (
    <div className="main-container py-10">
      <Breadcrumbs items={breadcrumbs} />
      <h1 className="text-3xl font-bold mb-6">Materias en {institucion}</h1>
      {visibles.length === 0 ? (
        <p className="text-text-secondary">Todavía no hay simuladores disponibles en esta institución.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {visibles.map((materia) => {
            const total = conteo.get(materia.id) || 0;
            return (
              <Card
                key={materia.id}
                title={materia.nombre}
                href={`/simuladores/${params.institucion}/${materia.slug}`}
                description={`${total} ${total === 1 ? 'simulador' : 'simuladores'}`}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
