export type OpcionTexto = { value: string; type: 'text' };

/** Pregunta lista para insertar. Imagen y feedback quedan vacíos a propósito. */
export type PreguntaCargaMasiva = {
  pregunta: string;
  opciones: OpcionTexto[];
  respuesta: OpcionTexto;
  pregunta_img_url: null;
  feedback: null;
};

export type ResultadoCargaMasiva = {
  preguntas: PreguntaCargaMasiva[];
  errores: string[];
};

const PREFIJO = /^(Q|O|R):\s*(.*)$/i;

/** Parte el texto en bloques. Una línea en blanco (o más) separa cada pregunta. */
export function separarBloques(texto: string): string[] {
  return (texto || '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim()
    .split(/\n\s*\n+/)
    .map((bloque) => bloque.trim())
    .filter(Boolean);
}

/**
 * Convierte el formato Q / O / R en preguntas de texto.
 * Las opciones se parten por `|`. La respuesta tiene que coincidir con una de ellas.
 */
export function parsearCargaMasiva(texto: string): ResultadoCargaMasiva {
  const bloques = separarBloques(texto);
  if (bloques.length === 0) {
    return { preguntas: [], errores: ['Pega al menos una pregunta.'] };
  }

  const preguntas: PreguntaCargaMasiva[] = [];
  const errores: string[] = [];

  bloques.forEach((bloque, indice) => {
    const numero = indice + 1;
    const lineas = bloque.split('\n').map((linea) => linea.trim()).filter(Boolean);
    let enunciado = '';
    let opcionesTexto = '';
    let respuestaTexto = '';
    let enunciadoListo = false;
    let opcionesListas = false;
    let respuestaLista = false;

    for (const linea of lineas) {
      const coincidencia = linea.match(PREFIJO);
      if (!coincidencia) {
        if (enunciadoListo && !opcionesListas && !respuestaLista) {
          enunciado = `${enunciado}\n${linea}`.trim();
          continue;
        }
        errores.push(`Pregunta ${numero}: la línea «${linea}» no empieza por Q:, O: o R:.`);
        return;
      }

      const clave = coincidencia[1].toUpperCase();
      const valor = (coincidencia[2] || '').trim();

      if (clave === 'Q') {
        if (enunciadoListo) {
          errores.push(`Pregunta ${numero}: tiene más de un enunciado (Q:).`);
          return;
        }
        enunciado = valor;
        enunciadoListo = true;
      } else if (clave === 'O') {
        if (opcionesListas) {
          errores.push(`Pregunta ${numero}: tiene más de una línea de opciones (O:).`);
          return;
        }
        opcionesTexto = valor;
        opcionesListas = true;
      } else if (respuestaLista) {
        errores.push(`Pregunta ${numero}: tiene más de una respuesta (R:).`);
        return;
      } else {
        respuestaTexto = valor;
        respuestaLista = true;
      }
    }

    if (!enunciado) {
      errores.push(`Pregunta ${numero}: falta el enunciado (Q:).`);
      return;
    }
    if (!opcionesListas) {
      errores.push(`Pregunta ${numero}: faltan las opciones (O:).`);
      return;
    }
    if (!respuestaLista) {
      errores.push(`Pregunta ${numero}: falta la respuesta correcta (R:).`);
      return;
    }

    const opciones: OpcionTexto[] = opcionesTexto
      .split('|')
      .map((opcion) => opcion.trim())
      .filter(Boolean)
      .map((value) => ({ value, type: 'text' as const }));

    if (opciones.length < 2) {
      errores.push(`Pregunta ${numero}: necesita al menos dos opciones separadas por |.`);
      return;
    }

    const respuesta = opciones.find((opcion) => opcion.value === respuestaTexto);
    if (!respuesta) {
      errores.push(`Pregunta ${numero}: «${respuestaTexto}» no coincide con ninguna opción.`);
      return;
    }

    preguntas.push({
      pregunta: enunciado,
      opciones,
      respuesta,
      pregunta_img_url: null,
      feedback: null,
    });
  });

  return { preguntas, errores };
}
