/**
 * `banco_lecciones.adjuntos` guarda el material descargable y, dentro del
 * mismo texto, los apuntes de pizarra. El apunte se marca con
 * `tipo: "pizarra"` (o con el título "Apuntes de Pizarra") para mostrarlo
 * aparte en el aula, sin una columna nueva.
 */

export const TITULO_APUNTES_PIZARRA = 'Apuntes de Pizarra';

export type Adjunto = { titulo: string; url: string; tipo?: string };

export function esApuntePizarra(adjunto: Pick<Adjunto, 'titulo' | 'tipo'>) {
  if (adjunto.tipo === 'pizarra') return true;
  return adjunto.titulo.trim().toLowerCase() === TITULO_APUNTES_PIZARRA.toLowerCase();
}

/**
 * Acepta un JSON `[{ titulo, url }]` o, como respaldo, una URL por línea.
 */
export function parsearAdjuntos(valor: unknown): Adjunto[] {
  if (!valor) return [];
  let lista: unknown = valor;
  if (typeof valor === 'string') {
    const texto = valor.trim();
    if (!texto) return [];
    try {
      lista = JSON.parse(texto);
    } catch {
      return texto
        .split('\n')
        .map((linea) => linea.trim())
        .filter((linea) => /^https?:\/\//i.test(linea))
        .map((url) => ({ titulo: '', url }));
    }
  }
  if (!Array.isArray(lista)) return [];
  return lista
    .map((item: { titulo?: unknown; url?: unknown; tipo?: unknown }) => ({
      titulo: typeof item?.titulo === 'string' ? item.titulo : '',
      url: typeof item?.url === 'string' ? item.url : '',
      tipo: typeof item?.tipo === 'string' ? item.tipo : undefined,
    }))
    .filter((item) => item.url);
}

/** Separa la URL de pizarra del resto para el formulario de administración. */
export function extraerApuntesPizarra(raw: string): { apuntesUrl: string; adjuntos: string } {
  const valor = raw.trim();
  if (!valor.startsWith('[') && !valor.startsWith('{')) {
    return { apuntesUrl: '', adjuntos: raw };
  }

  try {
    const lista = JSON.parse(valor);
    if (!Array.isArray(lista)) return { apuntesUrl: '', adjuntos: raw };
    const indice = lista.findIndex((item) =>
      esApuntePizarra({
        titulo: typeof item?.titulo === 'string' ? item.titulo : '',
        tipo: typeof item?.tipo === 'string' ? item.tipo : undefined,
      })
    );
    if (indice < 0) return { apuntesUrl: '', adjuntos: raw };

    const url = typeof lista[indice]?.url === 'string' ? lista[indice].url : '';
    const resto = lista.filter((_, i) => i !== indice);
    return {
      apuntesUrl: url,
      adjuntos: resto.length > 0 ? JSON.stringify(resto, null, 2) : '',
    };
  } catch {
    return { apuntesUrl: '', adjuntos: raw };
  }
}

/**
 * Vuelve a guardar el apunte dentro de `adjuntos`. Si no hay URL, conserva
 * el texto genérico tal como lo escribió el administrador.
 */
export function conApuntesPizarra(adjuntosTexto: string, apuntesUrl: string): string | null {
  const url = apuntesUrl.trim();
  const base = adjuntosTexto.trim();
  if (!url) return base || null;

  const resto = parsearAdjuntos(base).filter((item) => !esApuntePizarra(item));
  const lista = [
    ...resto.map((item) => (item.titulo ? { titulo: item.titulo, url: item.url } : { titulo: '', url: item.url })),
    { titulo: TITULO_APUNTES_PIZARRA, url, tipo: 'pizarra' },
  ];
  return JSON.stringify(lista);
}
