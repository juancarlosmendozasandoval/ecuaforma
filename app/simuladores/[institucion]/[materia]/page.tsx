import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { notFound, permanentRedirect } from 'next/navigation';
import { Shuffle } from 'lucide-react';
import Card from '../../../components/Card';
import Breadcrumbs from '../../../components/Breadcrumbs';
import {
  cargarMateriasCatalogo,
  filtroVisibilidad,
  nombreInstitucion,
  resolverMateria,
  simuladoresAccesibles,
} from '@/lib/simuladores/catalogo';

export const dynamic = 'force-dynamic';

type SimuladorCatalogo = { nombre: string | null; slug: string | null; es_dinamico: boolean | null };

/** Simuladores visibles de una materia (relacional) dentro de una institución. */
export default async function MateriaPage({ params }: { params: { institucion: string; materia: string } }) {
  const resuelta = resolverMateria(params.materia, await cargarMateriasCatalogo());
  if (!resuelta) notFound();
  if (!resuelta.canonica) permanentRedirect(`/simuladores/${params.institucion}/${resuelta.materia.slug}`);
  const { materia } = resuelta;

  const cookieStore = cookies();
  const supabase = createServerComponentClient({ cookies: () => cookieStore });
  const { data: { user } } = await supabase.auth.getUser();
  const institucion = nombreInstitucion(params.institucion);

  const { data, error } = await supabase
    .from('simuladores')
    .select('nombre, slug, es_dinamico')
    .eq('institucion', institucion)
    .eq('materia_id', materia.id)
    .eq('is_deleted', false)
    .or(filtroVisibilidad(await simuladoresAccesibles(supabase, user?.id)))
    .order('nombre');

  if (error || !data) {
    return <p className="main-container py-10">No se encontraron simuladores para esta materia.</p>;
  }

  const simuladores = (data as SimuladorCatalogo[]).filter((sim) => sim.slug);
  const mega = simuladores.filter((sim) => sim.es_dinamico);
  const normales = simuladores.filter((sim) => !sim.es_dinamico);

  const breadcrumbs = [
    { label: 'Simuladores', href: '/simuladores' },
    { label: institucion, href: `/simuladores/${params.institucion}` },
    { label: materia.nombre, href: `/simuladores/${params.institucion}/${materia.slug}`, isActive: true },
  ];

  return (
    <div className="main-container py-10">
      <Breadcrumbs items={breadcrumbs} />
      <h1 className="text-3xl font-bold mb-6">Simuladores de {materia.nombre}</h1>

      {simuladores.length === 0 && (
        <p className="text-text-secondary">Todavía no hay simuladores disponibles en esta materia.</p>
      )}

      {mega.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-violet-700">
            <Shuffle className="h-5 w-5" /> Mega-Simuladores (preguntas al azar)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {mega.map((sim) => (
              <Card key={sim.slug} title={sim.nombre || 'Simulador'} href={`/simulador/${sim.slug}`} description="Un examen distinto en cada intento" />
            ))}
          </div>
        </section>
      )}

      {normales.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {normales.map((sim) => (
            <Card key={sim.slug} title={sim.nombre || 'Simulador'} href={`/simulador/${sim.slug}`} />
          ))}
        </div>
      )}
    </div>
  );
}
