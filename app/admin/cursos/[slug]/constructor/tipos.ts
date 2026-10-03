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

/** Columnas de `modulos_curso` que usa el constructor. */
export const SELECT_MODULO = 'id, titulo, orden, curso_id, parent_id, created_at';

/** Carpeta (`modulos_curso`) con su contenido ordenado. `parent_id` nulo = módulo principal. */
export type ModuloConContenido = Tables<'modulos_curso'> & {
  contenido_modulos: ContenidoModulo[];
};

/** Módulo principal con sus submódulos (las lecciones viven en los submódulos). */
export type ModuloPrincipal = ModuloConContenido & {
  submodulos: ModuloConContenido[];
};

/** Arma el árbol de dos niveles a partir de la lista plana ordenada por `orden`. */
export function armarArbolModulos(modulos: ModuloConContenido[]): ModuloPrincipal[] {
  const ids = new Set(modulos.map((m) => m.id));
  const esRaiz = (m: ModuloConContenido) => !m.parent_id || !ids.has(m.parent_id);
  const porOrden = (a: ModuloConContenido, b: ModuloConContenido) => a.orden - b.orden;

  return modulos
    .filter(esRaiz)
    .sort(porOrden)
    .map((raiz) => ({
      ...raiz,
      submodulos: modulos.filter((m) => !esRaiz(m) && m.parent_id === raiz.id).sort(porOrden),
    }));
}

export type CursoResumen = Pick<Tables<'cursos'>, 'id' | 'nombre' | 'slug' | 'institucion'>;
