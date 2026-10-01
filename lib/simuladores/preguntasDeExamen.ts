/**
 * Convierte el join `simulador_preguntas → preguntas` en el arreglo plano
 * que ya consume `<Simulator />`. El `orden` sale de la relación, no de la pregunta.
 */
export function mapearPreguntasExamen<T extends { orden?: number | null }>(
  filas: { orden?: number | null; preguntas?: unknown }[] | null | undefined
): T[] {
  const preguntas: T[] = [];

  for (const fila of filas || []) {
    const cruda = Array.isArray(fila.preguntas) ? fila.preguntas[0] : fila.preguntas;
    if (!cruda || typeof cruda !== 'object') continue;
    preguntas.push({ ...(cruda as T), orden: fila.orden ?? 0 });
  }

  return preguntas;
}
