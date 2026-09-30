import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { FiltrosBiblioteca, LeccionBiblioteca, PaginaBiblioteca, TipoLeccion } from '@/types/biblioteca';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TIPOS = new Set<TipoLeccion>(['video', 'texto', 'simulador']);

/** Escapa los comodines de LIKE para que un título como "50%" se busque literal. */
const escaparLike = (texto: string) => texto.replace(/[\\%_]/g, (caracter) => `\\${caracter}`);

const uuidONull = (valor: string | null | undefined) => (valor && UUID.test(valor) ? valor : null);

/** PostgREST a veces devuelve la relación embebida como objeto y a veces como arreglo. */
function comoObjeto<T extends object>(valor: unknown): T | null {
  if (!valor || typeof valor !== 'object') return null;
  const fila = Array.isArray(valor) ? valor[0] : valor;
  return fila && typeof fila === 'object' ? (fila as T) : null;
}

function normalizarLeccion(fila: Record<string, unknown>): LeccionBiblioteca {
  const tema = comoObjeto<{ id?: string; nombre?: string; materia_id?: string; materias?: unknown }>(fila.temas);
  const materia = tema ? comoObjeto<{ id?: string; nombre?: string }>(tema.materias) : null;

  return {
    id: String(fila.id || ''),
    titulo_interno: String(fila.titulo_interno || ''),
    tipo: String(fila.tipo || ''),
    video_url: (fila.video_url as string | null) || null,
    simulador_id: (fila.simulador_id as string | null) || null,
    tema_id: (fila.tema_id as string | null) || null,
    created_at: (fila.created_at as string | null) || null,
    temas:
      tema?.id && tema.materia_id
        ? {
            id: tema.id,
            nombre: tema.nombre || '',
            materia_id: tema.materia_id,
            materias: materia?.id ? { id: materia.id, nombre: materia.nombre || '' } : null,
          }
        : null,
  };
}

/**
 * Lista lecciones del banco filtradas por materia, tema, tipo y texto libre.
 * La materia se filtra con un inner join sobre `temas` (la lección no guarda materia_id).
 * Orden estable `created_at desc, id desc` para que las páginas no se solapen.
 */
export async function listarLeccionesBiblioteca(
  supabase: SupabaseClient,
  filtros: FiltrosBiblioteca = {}
): Promise<PaginaBiblioteca> {
  const porPagina = Math.min(Math.max(Math.floor(filtros.porPagina || 25), 1), 100);
  const paginaPedida = Number.isFinite(filtros.pagina) ? Math.floor(filtros.pagina as number) : 1;
  const pagina = Math.max(paginaPedida, 1);
  const desde = (pagina - 1) * porPagina;
  const hasta = desde + porPagina - 1;

  const temaId = uuidONull(filtros.temaId);
  const materiaId = uuidONull(filtros.materiaId);
  const q = (filtros.q || '').trim().slice(0, 100);
  const tipo = filtros.tipo && TIPOS.has(filtros.tipo) ? filtros.tipo : null;

  // `!inner` convierte el embed en INNER JOIN: hace falta para filtrar por temas.materia_id
  // y para excluir lecciones sin tema. En el resto de casos el embed es un LEFT JOIN.
  const filtrarPorMateria = !filtros.sinClasificar && !temaId && !!materiaId;
  const relacionTemas = filtrarPorMateria ? 'temas!inner' : 'temas';

  let consulta = supabase.from('banco_lecciones').select(
    `id, titulo_interno, tipo, video_url, simulador_id, tema_id, created_at,
     ${relacionTemas} ( id, nombre, materia_id, materias ( id, nombre ) )`,
    { count: 'exact' }
  );

  if (filtros.sinClasificar) {
    consulta = consulta.is('tema_id', null);
  } else if (temaId) {
    consulta = consulta.eq('tema_id', temaId);
  } else if (filtrarPorMateria && materiaId) {
    consulta = consulta.eq('temas.materia_id', materiaId);
  }

  if (tipo) consulta = consulta.eq('tipo', tipo);
  if (q) consulta = consulta.ilike('titulo_interno', `%${escaparLike(q)}%`);

  const { data, count, error } = await consulta
    .order('created_at', { ascending: false, nullsFirst: false })
    .order('id', { ascending: false })
    .range(desde, hasta);

  // PGRST103: el rango pedido cae fuera del total (p. ej. ?pagina=999).
  if (error && error.code !== 'PGRST103') {
    throw new Error(`No se pudo listar la biblioteca: ${error.message}`);
  }

  const total = count || 0;
  return {
    lecciones: ((data || []) as Record<string, unknown>[]).map(normalizarLeccion),
    total,
    pagina,
    totalPaginas: Math.max(Math.ceil(total / porPagina), 1),
  };
}
