/**
 * Correo del administrador. Debe coincidir con el usado en la función SQL `is_admin()`.
 * Sin 'server-only' porque también lo importa middleware.ts (runtime Edge).
 */
export const ADMIN_EMAIL = 'juanjuacmend@gmail.com';

export const esAdmin = (email: string | null | undefined) =>
  (email || '').trim().toLowerCase() === ADMIN_EMAIL;
