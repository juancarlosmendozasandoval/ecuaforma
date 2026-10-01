/** Cookie de respaldo por si Supabase descarta la query de `redirectTo`. */
export const COOKIE_DESTINO_LOGIN = 'ecuaforma_next';

/**
 * Solo rutas internas del sitio. Rechaza `//dominio`, `/\dominio` y URLs
 * absolutas para que el parámetro no sirva de redirección abierta.
 */
export function destinoSeguro(valor: string | null | undefined): string | null {
  const ruta = (valor || '').trim();
  if (!ruta.startsWith('/') || ruta.startsWith('//') || ruta.startsWith('/\\')) return null;
  if (/[\u0000-\u001f]/.test(ruta)) return null;
  if (ruta.startsWith('/auth/')) return null;
  return ruta;
}
