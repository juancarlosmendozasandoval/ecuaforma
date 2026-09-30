import { NextResponse } from 'next/server';
import { confirmarPago } from '@/lib/pagos/confirmarPago';

/**
 * Notificación de PayPhone. No confía en el contenido recibido: solo toma el
 * par (id, clientTransactionId) y lo re-verifica contra PayPhone y la tabla `pagos`.
 * Nunca revoca accesos.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const payphoneId = Number(body?.id ?? body?.transactionId);
  const clientTxId = String(body?.clientTransactionId ?? body?.clientTxId ?? '').trim();

  if (!Number.isInteger(payphoneId) || payphoneId <= 0 || !clientTxId) {
    return NextResponse.json({ error: 'Payload inválido' }, { status: 400 });
  }

  const resultado = await confirmarPago(payphoneId, clientTxId);

  // Errores transitorios → 500 para que PayPhone reintente; el resto se acusa como recibido
  const reintentar = !resultado.ok && (resultado.motivo === 'payphone_error' || resultado.motivo === 'error_matricula');
  return NextResponse.json(
    { received: true, ok: resultado.ok },
    { status: reintentar ? 500 : 200 }
  );
}
