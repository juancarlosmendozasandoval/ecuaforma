/**
 * Preparación del texto antes de pasarlo a ReactMarkdown (sin React, se puede probar aislado).
 * Nunca se usa para comparar respuestas: solo transforma lo que se pinta.
 */

export type VarianteTexto = 'block' | 'inline';

/** `\[ \]` pasa a bloque `$$`; `\( \)` pasa a fórmula en línea `$`. */
export const normalizarLatex = (texto: string) =>
  texto
    .replace(/\\\[([\s\S]*?)\\\]/g, (_, formula) => `\n\n$$\n${(formula || '').trim()}\n$$\n\n`)
    .replace(/\\\(([\s\S]*?)\\\)/g, (_, formula) => `$${(formula || '').trim()}$`);

/** Índice del siguiente `$` sin escapar desde `desde`, o -1. */
function siguienteDolar(texto: string, desde: number) {
  for (let i = desde; i < texto.length; i += 1) {
    if (texto[i] === '\\') i += 1;
    else if (texto[i] === '$') return i;
  }
  return -1;
}

/**
 * `$8000, nos hacen un descuento de $1800` son precios, no una fórmula.
 * Es precio si al `$` le sigue un número que termina ahí (espacio o puntuación) y el tramo
 * hasta el siguiente `$` tiene palabras y nada de sintaxis LaTeX. `$5x + 2$`, `$3 \times 10^8$`
 * o `$99\%$` siguen siendo fórmulas.
 */
function esPrecio(texto: string, posicion: number) {
  const numero = /^ ?\d+(?:[.,]\d+)*/.exec(texto.slice(posicion + 1));
  if (!numero) return false;
  const finNumero = posicion + 1 + numero[0].length;
  if (finNumero < texto.length && !/[\s,.;:!?)\]'"»]/.test(texto[finNumero])) return false;

  const cierre = siguienteDolar(texto, finNumero);
  if (cierre === -1) return true;
  const tramo = texto.slice(posicion + 1, cierre);
  return !/[\\^_{}]/.test(tramo) && /\p{L}{2,}/u.test(tramo);
}

/** Escapa los `$` de precios recorriendo el texto en orden, sin tocar el interior de las fórmulas. */
export function protegerPrecios(texto: string) {
  let salida = '';
  let i = 0;
  while (i < texto.length) {
    const caracter = texto[i];
    if (caracter === '\\') {
      salida += texto.slice(i, i + 2);
      i += 2;
    } else if (caracter !== '$') {
      salida += caracter;
      i += 1;
    } else if (texto[i + 1] === '$') {
      const cierre = texto.indexOf('$$', i + 2);
      const fin = cierre === -1 ? i + 2 : cierre + 2;
      salida += texto.slice(i, fin);
      i = fin;
    } else if (esPrecio(texto, i)) {
      salida += '\\$';
      i += 1;
    } else {
      const cierre = siguienteDolar(texto, i + 1);
      const fin = cierre === -1 ? i + 1 : cierre + 1;
      salida += texto.slice(i, fin);
      i = fin;
    }
  }
  return salida;
}

/** Separa las fórmulas para no tocar su contenido (los índices impares son fórmulas). */
const FORMULA = /((?<!\\)\$\$[\s\S]+?\$\$|(?<!\\)\$(?:\\.|[^$\n])+?\$)/;

const escaparAsteriscos = (texto: string) => texto.replace(/\*/g, '\\*');

/**
 * `*...*` o `*…+…*` son acertijos de signos, no cursivas: si entre los asteriscos
 * no hay letras ni números, se dejan literales.
 */
const conservarAcertijosDeSignos = (texto: string) =>
  texto.replace(/(\*+)([^*\n]+?)\1/g, (coincidencia, _marcas, interior: string) =>
    /[\p{L}\p{N}]/u.test(interior) ? coincidencia : escaparAsteriscos(coincidencia)
  );

/**
 * En una opción no hay listas, títulos, citas, separadores ni bloques de código:
 * `- 3/6`, `1) Enunciar…` o `# de moles` deben verse tal cual.
 */
const neutralizarLineas = (texto: string) =>
  texto
    .replace(/^[ \t]+/gm, '')
    .replace(/^([-*_])(?=(?:[ \t]*\1){2,}[ \t]*$)/gm, '\\$1')
    .replace(/^(\d{1,9})([.)])(?=\s|$)/gm, '$1\\$2')
    .replace(/^([-+*]|#{1,6})(?=\s|$)/gm, '\\$1')
    .replace(/^>/gm, '\\>');

/** Un fragmento que sigue a una fórmula continúa su línea: solo se tocan las líneas siguientes. */
function neutralizarBloques(texto: string, empiezaLinea: boolean) {
  if (empiezaLinea) return neutralizarLineas(texto);
  const salto = texto.indexOf('\n');
  return salto === -1 ? texto : texto.slice(0, salto + 1) + neutralizarLineas(texto.slice(salto + 1));
}

/** Texto de preguntas, opciones y explicaciones listo para Markdown + GFM + KaTeX. */
export function prepararTextoExamen(texto: string, variante: VarianteTexto) {
  const normalizado = protegerPrecios(normalizarLatex((texto || '').replace(/\r\n?/g, '\n')));
  return normalizado
    .split(FORMULA)
    .map((parte, indice) => {
      if (indice % 2 === 1) return parte;
      const sinAcertijos = conservarAcertijosDeSignos(parte);
      return variante === 'inline' ? neutralizarBloques(sinAcertijos, indice === 0) : sinAcertijos;
    })
    .join('');
}
