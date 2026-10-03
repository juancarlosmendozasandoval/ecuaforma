/** Documentos legales públicos de Ecuaforma (footer, checkout y navegación entre ellos). */
export const DOCUMENTOS_LEGALES = [
  { href: '/legales/terminos', titulo: 'Términos y Condiciones' },
  { href: '/legales/privacidad', titulo: 'Política de Privacidad' },
  { href: '/legales/reembolsos', titulo: 'Política de Reembolsos' },
] as const;

export const CONTACTO_LEGAL = {
  email: 'contacto.ecuaforma@gmail.com',
  whatsapp: '+593 99 289 3010',
};

/** Fecha visible de la última revisión de los tres documentos. */
export const FECHA_ACTUALIZACION_LEGAL = '3 de octubre de 2026';
