/**
 * Temario de un curso en dos niveles: módulo principal → submódulo → lecciones.
 * Las mismas carpetas y lecciones que muestra la página del curso, en el mismo
 * orden (módulo, submódulo y luego `orden`).
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

export type SubmoduloTemario = {
  id: string;
  titulo: string | null;
  orden: number;
  lecciones: ContenidoTemario[];
};

export type ModuloTemario = {
  id: string;
  titulo: string | null;
  orden: number;
  /** Lecciones colgadas directamente del módulo principal (solo datos anteriores a la jerarquía). */
  lecciones: ContenidoTemario[];
  submodulos: SubmoduloTemario[];
};

export type LeccionPlana = ContenidoTemario & {
  /** Carpeta que contiene la lección (normalmente el submódulo). */
  modulo: { id: string; titulo: string | null; orden: number };
  /** Módulo principal cuando la lección está en un submódulo. */
  moduloPadre: { id: string; titulo: string | null } | null;
  numero: number;
};

type ClienteTemario = { from: (tabla: string) => any };
type FilaModulo = { id: string; titulo: string | null; orden: number; parent_id?: string | null };

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

/** "Física › Cinemática" para una lección dentro de un submódulo. */
export function rutaModuloLeccion(leccion: Pick<LeccionPlana, 'modulo' | 'moduloPadre'>) {
  const hijo = leccion.modulo.titulo || 'Módulo';
  return leccion.moduloPadre ? `${leccion.moduloPadre.titulo || 'Módulo'} › ${hijo}` : hijo;
}

export function contarLeccionesModulo(modulo: ModuloTemario) {
  return modulo.lecciones.length + modulo.submodulos.reduce((total, sub) => total + sub.lecciones.length, 0);
}

/** Si la columna `parent_id` aún no existe, todas las carpetas se tratan como principales. */
async function leerModulos(supabase: ClienteTemario, cursoId: string): Promise<FilaModulo[] | null> {
  const consulta = (campos: string) =>
    supabase.from('modulos_curso').select(campos).eq('curso_id', cursoId).order('orden', { ascending: true });

  let { data, error } = await consulta('id, titulo, orden, parent_id');
  if (error?.code === '42703') ({ data, error } = await consulta('id, titulo, orden'));
  if (error) {
    console.error('Error al cargar los módulos del curso:', error);
    return null;
  }
  return (data || []) as FilaModulo[];
}

/**
 * Árbol de carpetas del curso con su contenido y la lección del banco.
 * Se descartan filas cuya lección ya no existe.
 */
export async function cargarTemarioCurso(
  supabase: ClienteTemario,
  cursoId: string,
  camposBanco = CAMPOS_BANCO_TEMARIO
): Promise<ModuloTemario[]> {
  const filas = await leerModulos(supabase, cursoId);
  if (!filas || filas.length === 0) return [];

  const { data: contenidoData, error: errorContenido } = await supabase
    .from('contenido_modulos')
    .select(`id, modulo_id, orden, titulo_mostrar, is_preview, banco_lecciones ( ${camposBanco} )`)
    .in('modulo_id', filas.map((modulo) => modulo.id))
    .order('orden', { ascending: true });

  if (errorContenido) console.error('Error al cargar las lecciones del curso:', errorContenido);

  const contenido: ContenidoTemario[] = ((errorContenido ? [] : contenidoData || []) as any[])
    .map((fila) => ({
      id: fila.id,
      modulo_id: fila.modulo_id ?? null,
      orden: Number(fila.orden) || 0,
      titulo_mostrar: fila.titulo_mostrar ?? null,
      is_preview: fila.is_preview ?? null,
      banco_lecciones: leerBanco(fila.banco_lecciones),
    }))
    .filter((fila) => fila.banco_lecciones);

  const leccionesDe = (moduloId: string) => contenido.filter((fila) => fila.modulo_id === moduloId);
  const base = (fila: FilaModulo) => ({ id: fila.id, titulo: fila.titulo, orden: Number(fila.orden) || 0 });
  const ids = new Set(filas.map((fila) => fila.id));

  // Un submódulo cuyo padre no está en el curso se muestra como principal para no perderlo.
  const esRaiz = (fila: FilaModulo) => !fila.parent_id || !ids.has(fila.parent_id);

  return filas.filter(esRaiz).map((raiz) => ({
    ...base(raiz),
    lecciones: leccionesDe(raiz.id),
    submodulos: filas
      .filter((fila) => !esRaiz(fila) && fila.parent_id === raiz.id)
      .map((sub) => ({ ...base(sub), lecciones: leccionesDe(sub.id) })),
  }));
}

/** Lista única en orden de estudio: módulo, sus lecciones sueltas y luego cada submódulo. */
export function aplanarLecciones(modulos: ModuloTemario[]): LeccionPlana[] {
  let numero = 0;
  return modulos.flatMap((modulo) => {
    const raiz = { id: modulo.id, titulo: modulo.titulo, orden: modulo.orden };
    const sueltas = modulo.lecciones.map((leccion) => ({ ...leccion, modulo: raiz, moduloPadre: null, numero: ++numero }));
    const anidadas = modulo.submodulos.flatMap((sub) =>
      sub.lecciones.map((leccion) => ({
        ...leccion,
        modulo: { id: sub.id, titulo: sub.titulo, orden: sub.orden },
        moduloPadre: { id: modulo.id, titulo: modulo.titulo },
        numero: ++numero,
      }))
    );
    return [...sueltas, ...anidadas];
  });
}
