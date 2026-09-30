import type { Tables } from '@/types/supabase';

/** Columnas de `banco_lecciones` que usa el constructor (en consultas y joins). */
export const SELECT_LECCION_BANCO = 'id, titulo_interno, tipo, video_url, simulador_id, created_at';

export type LeccionBanco = Pick<
  Tables<'banco_lecciones'>,
  'id' | 'titulo_interno' | 'tipo' | 'video_url' | 'simulador_id' | 'created_at'
>;

/** Fila de `contenido_modulos` con la lección del banco a la que apunta. */
export type ContenidoModulo = Tables<'contenido_modulos'> & {
  banco_lecciones: LeccionBanco | null;
};

/** Carpeta (`modulos_curso`) con su contenido ordenado. */
export type ModuloConContenido = Tables<'modulos_curso'> & {
  contenido_modulos: ContenidoModulo[];
};

export type CursoResumen = Pick<Tables<'cursos'>, 'id' | 'nombre' | 'slug' | 'institucion'>;
