/**
 * Configuración de Mega-Simuladores. Sin dependencias de servidor: la usa el
 * formulario para avisar antes de guardar y la Server Action para validar.
 * Refleja las restricciones de la tabla `simuladores`.
 */
export const CANTIDAD_MINIMA = 1;
export const CANTIDAD_MAXIMA = 200;
export const CANTIDAD_POR_DEFECTO = 20;

export type ConfigDinamica = {
  es_dinamico: boolean;
  temas_dinamicos: string[];
  cantidad_preguntas: number;
};

/** Tema para el selector, con su materia y cuántas preguntas tiene en el banco. */
export type TemaSelector = {
  id: string;
  nombre: string;
  materia: string;
  preguntas: number | null;
};

export const CONFIG_ESTATICA: ConfigDinamica = {
  es_dinamico: false,
  temas_dinamicos: [],
  cantidad_preguntas: CANTIDAD_POR_DEFECTO,
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function configDesdeSimulador(sim: Partial<ConfigDinamica> | null | undefined): ConfigDinamica {
  return {
    es_dinamico: !!sim?.es_dinamico,
    temas_dinamicos: Array.isArray(sim?.temas_dinamicos) ? sim.temas_dinamicos : [],
    cantidad_preguntas: Number(sim?.cantidad_preguntas) || CANTIDAD_POR_DEFECTO,
  };
}

/**
 * Normaliza la configuración. Si el simulador no es dinámico se guardan los
 * temas vacíos; si lo es, exige al menos un tema y una cantidad entera 1-200.
 */
export function validarConfigDinamica(
  entrada: Partial<Record<keyof ConfigDinamica, unknown>>
): { ok: true; datos: ConfigDinamica } | { ok: false; mensaje: string } {
  const esDinamico = entrada.es_dinamico === true;
  const cantidad = Number(entrada.cantidad_preguntas);

  if (!esDinamico) {
    const valida = Number.isInteger(cantidad) && cantidad >= CANTIDAD_MINIMA && cantidad <= CANTIDAD_MAXIMA;
    return { ok: true, datos: { ...CONFIG_ESTATICA, cantidad_preguntas: valida ? cantidad : CANTIDAD_POR_DEFECTO } };
  }

  if (!Number.isInteger(cantidad) || cantidad < CANTIDAD_MINIMA || cantidad > CANTIDAD_MAXIMA) {
    return { ok: false, mensaje: `La cantidad de preguntas debe ser un número entero entre ${CANTIDAD_MINIMA} y ${CANTIDAD_MAXIMA}.` };
  }

  const crudos = Array.isArray(entrada.temas_dinamicos) ? entrada.temas_dinamicos : [];
  if (crudos.some((tema) => typeof tema !== 'string' || !UUID.test(tema))) {
    return { ok: false, mensaje: 'Hay temas con un identificador inválido.' };
  }
  const temas = Array.from(new Set(crudos as string[]));
  if (temas.length === 0) {
    return { ok: false, mensaje: 'Un simulador dinámico necesita al menos un tema.' };
  }

  return { ok: true, datos: { es_dinamico: true, temas_dinamicos: temas, cantidad_preguntas: cantidad } };
}
