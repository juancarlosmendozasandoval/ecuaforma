import type { Tables } from '@/types/supabase';

/** Materia de la biblioteca (Álgebra, Lenguaje, Física…). */
export type Materia = Tables<'materias'>;

/** Tema dentro de una materia. La materia se deduce siempre de aquí. */
export type Tema = Tables<'temas'>;

export type TipoLeccion = 'video' | 'texto' | 'simulador';

/**
 * Fila de listado: metadatos de la lección y su clasificación anidada.
 * `temas` es null cuando la lección todavía no tiene tema (`tema_id` nulo).
 * No incluye `contenido_html` ni `adjuntos`: el listado no los necesita.
 */
export type LeccionBiblioteca = Pick<
  Tables<'banco_lecciones'>,
  'id' | 'titulo_interno' | 'tipo' | 'video_url' | 'simulador_id' | 'tema_id' | 'created_at'
> & {
  temas:
    | (Pick<Tema, 'id' | 'nombre' | 'materia_id'> & {
        materias: Pick<Materia, 'id' | 'nombre'> | null;
      })
    | null;
};

/** Filtros de la biblioteca. Los ids inválidos se ignoran en la consulta. */
export interface FiltrosBiblioteca {
  materiaId?: string | null;
  temaId?: string | null;
  /** Solo lecciones con `tema_id` nulo. Tiene prioridad sobre materia y tema. */
  sinClasificar?: boolean;
  tipo?: TipoLeccion | null;
  /** Búsqueda libre sobre `titulo_interno` (índice trigram). */
  q?: string | null;
  /** Página desde 1. */
  pagina?: number;
  /** Tamaño de página. Se recorta a 1–100. */
  porPagina?: number;
}

export interface PaginaBiblioteca {
  lecciones: LeccionBiblioteca[];
  total: number;
  pagina: number;
  totalPaginas: number;
}
