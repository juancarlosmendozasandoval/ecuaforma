/**
 * Temario de un curso: las mismas carpetas y lecciones que muestra
 * la página del curso, en el mismo orden (módulo y luego `orden`).
 */

export const CAMPOS_BANCO_TEMARIO = 'id, titulo_interno, tipo, video_url, simulador_id';

/** Campos extra que solo necesita el aula (texto, adjuntos). */
export const CAMPOS_BANCO_AULA =
  'id, titulo_interno, tipo, video_url, simulador_id, contenido_html, adjuntos, created_at';

export type LeccionBancoTemario = {
  id: string;
  titulo_interno: string | null;
  tipo: string | null;
  video_url: string | null;
  simulador_id: string | null;
  contenido_html?: string | null;
  adjuntos?: string | null;
  created_at?: string | null;
};

export type ContenidoTemario = {
  id: string;
  modulo_id: string | null;
  orden: number;
  titulo_mostrar: string | null;
  is_preview: boolean | null;
  banco_lecciones: LeccionBancoTemario | null;
};

export type ModuloTemario = {
  id: string;
  titulo: string | null;
  orden: number;
  lecciones: ContenidoTemario[];
};

export type LeccionPlana = ContenidoTemario & {
  modulo: { id: string; titulo: string | null; orden: number };
  numero: number;
};

type ClienteTemario = { from: (tabla: string) => any };

function leerBanco(valor: unknown): LeccionBancoTemario | null {
  const fila = Array.isArray(valor) ? valor[0] : valor;
  if (!fila || typeof fila !== 'object') return null;
  const banco = fila as LeccionBancoTemario;
  if (!banco.id) return null;
  return banco;
}

export function tituloLeccionTemario(item: Pick<ContenidoTemario, 'titulo_mostrar' | 'banco_lecciones'> | null) {
  return item?.titulo_mostrar || item?.banco_lecciones?.titulo_interno || 'Clase sin título';
}

/**
 * Carpetas del curso y su contenido, con la lección del banco.
 * Se descartan filas cuya lección ya no existe.
 */
export async function cargarTemarioCurso(
  supabase: ClienteTemario,
  cursoId: string,
  camposBanco = CAMPOS_BANCO_TEMARIO
): Promise<ModuloTemario[]> {
  const { data: modulosData, error: errorModulos } = await supabase
    .from('modulos_curso')
    .select('id, titulo, orden')
    .eq('curso_id', cursoId)
    .order('orden', { ascending: true });

  if (errorModulos) {
    console.error('Error al cargar los módulos del curso:', errorModulos);
    return [];
  }

  const modulosBase = (modulosData || []) as Pick<ModuloTemario, 'id' | 'titulo' | 'orden'>[];
  if (modulosBase.length === 0) return [];

  const { data: contenidoData, error: errorContenido } = await supabase
    .from('contenido_modulos')
    .select(`id, modulo_id, orden, titulo_mostrar, is_preview, banco_lecciones ( ${camposBanco} )`)
    .in('modulo_id', modulosBase.map((modulo) => modulo.id))
    .order('orden', { ascending: true });

  if (errorContenido) {
    console.error('Error al cargar las lecciones del curso:', errorContenido);
    return modulosBase.map((modulo) => ({ ...modulo, lecciones: [] }));
  }

  const contenido: ContenidoTemario[] = ((contenidoData || []) as any[])
    .map((fila) => ({
      id: fila.id,
      modulo_id: fila.modulo_id ?? null,
      orden: Number(fila.orden) || 0,
      titulo_mostrar: fila.titulo_mostrar ?? null,
      is_preview: fila.is_preview ?? null,
      banco_lecciones: leerBanco(fila.banco_lecciones),
    }))
    .filter((fila) => fila.banco_lecciones);

  return modulosBase.map((modulo) => ({
    ...modulo,
    lecciones: contenido.filter((fila) => fila.modulo_id === modulo.id),
  }));
}

/** Lista única: primero el módulo (por `orden`) y, dentro, cada lección. */
export function aplanarLecciones(modulos: ModuloTemario[]): LeccionPlana[] {
  let numero = 0;
  return modulos.flatMap((modulo) =>
    modulo.lecciones.map((leccion) => ({
      ...leccion,
      modulo: { id: modulo.id, titulo: modulo.titulo, orden: modulo.orden },
      numero: ++numero,
    }))
  );
}
