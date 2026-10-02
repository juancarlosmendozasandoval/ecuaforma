import { createHmac, timingSafeEqual } from 'crypto';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RECHAZADOS = new Set([
  'failed',
  'failure',
  'rejected',
  'rechazado',
  'cancelled',
  'canceled',
  'denied',
  'voided',
  'expired',
  'refunded',
]);

export type DatosPago = { email: string; cursoRef: string };

function texto(valor: unknown) {
  return typeof valor === 'string' ? valor.trim() : '';
}

function objeto(valor: unknown): Record<string, unknown> | null {
  if (!valor || typeof valor !== 'object' || Array.isArray(valor)) return null;
  return valor as Record<string, unknown>;
}

function igual(recibido: string, esperado: string) {
  const a = Buffer.from(recibido);
  const b = Buffer.from(esperado);
  if (a.length === 0 || a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * Acepta el secreto compartido en `Authorization: Bearer` o
 * `x-payment-webhook-secret`, o una firma HMAC-SHA256 del cuerpo
 * en `x-payment-signature` (hex, con o sin el prefijo `sha256=`).
 */
export function webhookAutorizado(secreto: string, token: string, firma: string, cuerpo: string) {
  const clave = secreto.trim();
  if (!clave) return false;
  if (igual(token.trim(), clave)) return true;

  const limpia = firma.trim().replace(/^sha256=/i, '');
  if (!limpia) return false;
  const esperada = createHmac('sha256', clave).update(cuerpo).digest('hex');
  return igual(limpia, esperada);
}

export type NotificacionPayPhone = {
  clientTxId: string;
  payphoneId: number | null;
  /** true aprobado, false rechazado/cancelado, null si no informa el estado. */
  aprobada: boolean | null;
  montoCentavos: number | null;
};

/** Lee una clave sin importar mayúsculas: PayPhone usa `ClientTransactionId` o `clientTransactionId`. */
function campo(datos: Record<string, unknown>, ...nombres: string[]) {
  const claves = Object.keys(datos);
  for (const nombre of nombres) {
    const clave = claves.find((k) => k.toLowerCase() === nombre.toLowerCase());
    if (clave !== undefined && datos[clave] !== null && datos[clave] !== undefined && datos[clave] !== '') {
      return datos[clave];
    }
  }
  return undefined;
}

/** Datos de la notificación de PayPhone. Devuelve null si no trae `clientTransactionId`. */
export function extraerNotificacionPayPhone(body: unknown): NotificacionPayPhone | null {
  const raiz = objeto(body);
  if (!raiz) return null;
  const datos = objeto(campo(raiz, 'data', 'transaction')) || raiz;

  const clientTxId = String(campo(datos, 'clientTransactionId', 'clientTxId') ?? '').trim();
  if (!clientTxId) return null;

  const id = Number(campo(datos, 'transactionId', 'id'));
  const payphoneId = Number.isInteger(id) && id > 0 ? id : null;

  const codigo = Number(campo(datos, 'statusCode'));
  const estado = String(campo(datos, 'transactionStatus', 'status') ?? '').trim().toLowerCase();
  let aprobada: boolean | null = null;
  if (codigo === 3 || estado === 'approved' || estado === 'aprobado') aprobada = true;
  else if (codigo === 2 || RECHAZADOS.has(estado)) aprobada = false;

  const monto = Number(campo(datos, 'amount'));
  const montoCentavos = Number.isInteger(monto) && monto > 0 ? monto : null;

  return { clientTxId, payphoneId, aprobada, montoCentavos };
}

export function transaccionRechazada(body: unknown) {
  const datos = objeto(body);
  if (!datos) return false;
  const estado = (
    texto(datos.status) ||
    texto(datos.transactionStatus) ||
    texto(datos.estado) ||
    texto(datos.event)
  ).toLowerCase();
  return RECHAZADOS.has(estado);
}

/** Email del cliente y curso (UUID, slug o nombre) desde cuerpos de PayPhone, PayPal u otro aviso. */
export function extraerDatosPago(body: unknown): DatosPago | null {
  const datos = objeto(body);
  if (!datos) return null;

  const cliente = objeto(datos.customer) || objeto(datos.buyer) || objeto(datos.payer);
  const email = (
    texto(datos.email) ||
    texto(datos.customer_email) ||
    texto(cliente?.email) ||
    texto(cliente?.email_address)
  ).toLowerCase();

  const primero = Array.isArray(datos.items) ? objeto(datos.items[0]) : null;
  const cursoRef =
    texto(datos.curso_id) ||
    texto(datos.cursoId) ||
    texto(datos.course_id) ||
    texto(datos.sku) ||
    texto(datos.product_id) ||
    texto(datos.nombre) ||
    texto(datos.course_name) ||
    texto(primero?.sku) ||
    texto(primero?.curso_id) ||
    texto(primero?.name);

  if (!EMAIL.test(email) || !cursoRef) return null;
  return { email, cursoRef };
}
