import { NextResponse } from 'next/server';
import { matricularPorPago } from '@/lib/pagos/matricularPorPago';
import { extraerDatosPago, transaccionRechazada, webhookAutorizado } from '@/lib/pagos/webhookPago';

export const dynamic = 'force-dynamic';

/**
 * Aviso de una pasarela (PayPhone, PayPal u otra) cuando un cobro sale bien.
 * Solo entra si trae `PAYMENT_WEBHOOK_SECRET` como token o como firma HMAC.
 */
export async function POST(request: Request) {
  const cuerpo = await request.text();
  const secreto = process.env.PAYMENT_WEBHOOK_SECRET || '';
  const token =
    request.headers.get('x-payment-webhook-secret') ||
    (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  const firma = request.headers.get('x-payment-signature') || '';

  if (!webhookAutorizado(secreto, token, firma, cuerpo)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const body = parsearCuerpo(cuerpo);
  if (transaccionRechazada(body)) {
    return NextResponse.json({ received: true, ok: false }, { status: 200 });
  }

  const datos = extraerDatosPago(body);
  if (!datos) {
    return NextResponse.json({ error: 'Faltan el email o el curso' }, { status: 400 });
  }

  try {
    const resultado = await matricularPorPago(datos.email, datos.cursoRef);
    if (!resultado.ok && (resultado.motivo === 'usuario' || resultado.motivo === 'matricula')) {
      return NextResponse.json({ received: true, ok: false }, { status: 500 });
    }
    return NextResponse.json({ received: true, ok: resultado.ok }, { status: 200 });
  } catch (error) {
    console.error('Error en el webhook de pagos:', error instanceof Error ? error.message : error);
    return NextResponse.json({ received: true, ok: false }, { status: 500 });
  }
}

function parsearCuerpo(cuerpo: string) {
  try {
    return JSON.parse(cuerpo);
  } catch {
    return null;
  }
}
