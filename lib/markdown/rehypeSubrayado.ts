/** Nodo hast mínimo: incluye los `raw` que deja el HTML escrito dentro del Markdown. */
type Nodo = { type: string; value?: string; tagName?: string; properties?: Record<string, unknown>; children?: Nodo[] };

const esEtiqueta = (nodo: Nodo, etiqueta: RegExp) => nodo.type === 'raw' && etiqueta.test((nodo.value || '').trim());

function envolverSubrayados(nodo: Nodo) {
  const hijos = nodo.children;
  if (!hijos) return;
  for (let i = 0; i < hijos.length; i += 1) {
    if (esEtiqueta(hijos[i], /^<u>$/i)) {
      const fin = hijos.findIndex((hijo, j) => j > i && esEtiqueta(hijo, /^<\/u>$/i));
      if (fin !== -1) hijos.splice(i, fin - i + 1, { type: 'element', tagName: 'u', properties: {}, children: hijos.slice(i + 1, fin) });
    }
    envolverSubrayados(hijos[i]);
  }
}

/** Único HTML permitido en preguntas: `<u>…</u>` (subrayado); el resto se muestra como texto. */
const rehypeSubrayado = () => (arbol: Nodo) => envolverSubrayados(arbol);

export default rehypeSubrayado;
