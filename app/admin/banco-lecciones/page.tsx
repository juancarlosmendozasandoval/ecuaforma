import { requireAdmin } from '@/lib/auth/requireAdmin';
import { listarLeccionesBiblioteca } from '@/lib/biblioteca/listarLecciones';
import type { FiltrosBiblioteca, PaginaBiblioteca, Tema, TipoLeccion } from '@/types/biblioteca';
import BancoLeccionesCliente, {
  type ConteoBanco,
  type FilaBanco,
  type SimuladorOpcion,
} from './BancoLeccionesCliente';

export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const POR_PAGINA = 25;

type SearchParams = { [key: string]: string | string[] | undefined };

const param = (sp: SearchParams, key: string) => {
  const valor = sp[key];
  return (Array.isArray(valor) ? valor[0] : valor) || '';
};

const uuidONull = (valor: string) => (UUID.test(valor) ? valor : null);

function leerFiltros(sp: SearchParams): FiltrosBiblioteca {
  const tipo = param(sp, 'tipo');
  const pagina = Number(param(sp, 'pagina'));
  return {
    materiaId: uuidONull(param(sp, 'materia')),
    temaId: uuidONull(param(sp, 'tema')),
    sinClasificar: param(sp, 'sin') === '1',
    tipo: tipo === 'video' || tipo === 'texto' || tipo === 'simulador' ? tipo : null,
    q: param(sp, 'q').trim().slice(0, 100) || null,
    pagina: Number.isFinite(pagina) && pagina > 0 ? Math.floor(pagina) : 1,
    porPagina: POR_PAGINA,
  };
}

/** Si la URL trae un tema de otra materia, se ignora el tema. Si solo trae tema, se deduce la materia. */
function resolverFiltros(filtros: FiltrosBiblioteca, temas: Pick<Tema, 'id' | 'materia_id'>[]): FiltrosBiblioteca {
  if (filtros.sinClasificar) return { ...filtros, materiaId: null, temaId: null };

  const tema = filtros.temaId ? temas.find((fila) => fila.id === filtros.temaId) : undefined;
  if (filtros.temaId && !tema) return { ...filtros, temaId: null };
  if (tema && filtros.materiaId && tema.materia_id !== filtros.materiaId) return { ...filtros, temaId: null };
  if (tema && !filtros.materiaId) return { ...filtros, materiaId: tema.materia_id };
  return filtros;
}

/**
 * Almacén central: listado paginado de `banco_lecciones` con la taxonomía
 * materias → temas. Los filtros viven en la URL (`searchParams`).
 */
export default async function BancoLeccionesPage({ searchParams }: { searchParams: SearchParams }) {
  const { supabase } = await requireAdmin();
  const filtrosUrl = leerFiltros(searchParams);

  const contar = async (tipo?: TipoLeccion) => {
    let consulta = supabase.from('banco_lecciones').select('id', { count: 'exact', head: true });
    if (tipo) consulta = consulta.eq('tipo', tipo);
    const { count } = await consulta;
    return count || 0;
  };

  const [{ data: materiasData }, { data: temasData }, { data: simuladoresData }, total, video, texto, simulador] =
    await Promise.all([
      supabase.from('materias').select('id, nombre, slug, orden, descripcion, created_at').order('orden').order('nombre'),
      supabase.from('temas').select('id, nombre, slug, materia_id, orden, created_at').order('orden').order('nombre'),
      supabase.from('simuladores').select('id, nombre, institucion, materia').eq('is_deleted', false).order('created_at', { ascending: false }),
      contar(),
      contar('video'),
      contar('texto'),
      contar('simulador'),
    ]);

  const temas = temasData || [];
  const filtros = resolverFiltros(filtrosUrl, temas);

  let listado: PaginaBiblioteca = { lecciones: [], total: 0, pagina: filtros.pagina || 1, totalPaginas: 1 };
  let errorLista = '';
  try {
    listado = await listarLeccionesBiblioteca(supabase, filtros);
  } catch (error) {
    errorLista = error instanceof Error ? error.message : 'No se pudo listar la biblioteca.';
  }

  const ids = listado.lecciones.map((leccion) => leccion.id).filter(Boolean);
  const usosPorId = new Map<string, number>();
  const detallePorId = new Map<string, { contenido_html: string | null; adjuntos: string | null }>();

  if (ids.length > 0) {
    const [{ data: usosData }, { data: detalleData }] = await Promise.all([
      supabase.from('contenido_modulos').select('leccion_id').in('leccion_id', ids),
      supabase.from('banco_lecciones').select('id, contenido_html, adjuntos').in('id', ids),
    ]);

    for (const fila of usosData || []) {
      const leccionId = fila.leccion_id || '';
      if (!leccionId) continue;
      usosPorId.set(leccionId, (usosPorId.get(leccionId) || 0) + 1);
    }
    for (const fila of detalleData || []) {
      detallePorId.set(fila.id, {
        contenido_html: fila.contenido_html || null,
        adjuntos: fila.adjuntos || null,
      });
    }
  }

  const filas: FilaBanco[] = listado.lecciones.map((leccion) => {
    const detalle = detallePorId.get(leccion.id);
    return {
      ...leccion,
      contenido_html: detalle?.contenido_html || null,
      adjuntos: detalle?.adjuntos || null,
      usos: usosPorId.get(leccion.id) || 0,
    };
  });

  const conteo: ConteoBanco = { total, video, texto, simulador };

  return (
    <BancoLeccionesCliente
      filas={filas}
      filtros={filtros}
      total={listado.total}
      pagina={listado.pagina}
      totalPaginas={listado.totalPaginas}
      porPagina={POR_PAGINA}
      errorLista={errorLista}
      materias={materiasData || []}
      temas={temas}
      simuladores={(simuladoresData || []) as SimuladorOpcion[]}
      conteo={conteo}
    />
  );
}
