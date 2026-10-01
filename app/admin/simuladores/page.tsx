import { requireAdmin } from '@/lib/auth/requireAdmin';
import type { Tables } from '@/types/supabase';
import SimuladoresCliente from './SimuladoresCliente';

/** Listado paginado en el servidor. `q` busca por nombre; `pagina` e `inst` vienen de la URL. */
export const dynamic = 'force-dynamic';

const POR_PAGINA = 20;
const INSTITUCIONES_BASE = ['FAE', 'Armada', 'Ejército', 'Policía'];

type SearchParams = { [key: string]: string | string[] | undefined };

const param = (sp: SearchParams, key: string) => {
  const valor = sp[key];
  return (Array.isArray(valor) ? valor[0] : valor) || '';
};

const escaparLike = (texto: string) => texto.replace(/[\\%_]/g, (caracter) => `\\${caracter}`);

type SimuladorAdmin = Tables<'simuladores'>;

/**
 * Gestor de simuladores. La búsqueda (`q`) y la página viven en la URL
 * para que el listado se pagine en el servidor.
 */
export default async function GestionSimuladoresPage({ searchParams }: { searchParams: SearchParams }) {
  const { supabase } = await requireAdmin();

  const q = param(searchParams, 'q').trim().slice(0, 100);
  const institucion = param(searchParams, 'inst').trim();
  const paginaPedida = Number(param(searchParams, 'pagina'));
  const pagina = Number.isFinite(paginaPedida) && paginaPedida > 0 ? Math.floor(paginaPedida) : 1;
  const desde = (pagina - 1) * POR_PAGINA;
  const hasta = desde + POR_PAGINA - 1;

  let consulta = supabase
    .from('simuladores')
    .select('*', { count: 'exact' })
    .eq('is_deleted', false);

  if (q) consulta = consulta.ilike('nombre', `%${escaparLike(q)}%`);
  if (institucion) consulta = consulta.eq('institucion', institucion);

  const [{ data, count, error }, { data: catalogo }] = await Promise.all([
    consulta
      .order('created_at', { ascending: false, nullsFirst: false })
      .order('id', { ascending: false })
      .range(desde, hasta),
    supabase.from('simuladores').select('institucion').eq('is_deleted', false),
  ]);

  const fueraDeRango = error?.code === 'PGRST103';
  const errorLista = error && !fueraDeRango ? 'No se pudo cargar el listado de simuladores.' : '';
  const simuladores = (fueraDeRango ? [] : data || []) as SimuladorAdmin[];
  const total = count || 0;
  const totalPaginas = Math.max(Math.ceil(total / POR_PAGINA), 1);

  const instituciones = Array.from(
    new Set([
      ...INSTITUCIONES_BASE,
      ...(catalogo || []).map((fila) => fila.institucion || ''),
    ])
  )
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, 'es'));

  return (
    <SimuladoresCliente
      simuladores={simuladores}
      instituciones={instituciones}
      q={q}
      institucion={institucion}
      pagina={pagina}
      totalPaginas={totalPaginas}
      total={total}
      porPagina={POR_PAGINA}
      errorLista={errorLista}
    />
  );
}
