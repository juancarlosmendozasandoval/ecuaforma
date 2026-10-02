import { NextResponse } from 'next/server';
import { aprobarPagoNotificado, confirmarPago, type ResultadoConfirmacion } from '@/lib/pagos/confirmarPago';
import { matricularPorPago } from '@/lib/pagos/matricularPorPago';
import {
  extraerDatosPago,
  extraerNotificacionPayPhone,
  transaccionRechazada,
  webhookAutorizado,
} from '@/lib/pagos/webhookPago';

export const dynamic = 'force-dynamic';

/**
 * Notificación de pago. PayPhone no envía cabeceras propias, así que el secreto
 * llega en la URL: /api/webhooks/pagos?secret=PAYMENT_WEBHOOK_SECRET.
 * También se aceptan el token por cabecera o la firma HMAC para otras pasarelas.
 */
export async function POST(request: Request) {
  const cuerpo = await request.text();
  const secreto = process.env.PAYMENT_WEBHOOK_SECRET || '';
  const token =
    new URL(request.url).searchParams.get('secret') ||
    request.headers.get('x-payment-webhook-secret') ||
    (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  const firma = request.headers.get('x-payment-signature') || '';

  if (!webhookAutorizado(secreto, token, firma, cuerpo)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const body = parsearCuerpo(cuerpo);

  try {
    const notificacion = extraerNotificacionPayPhone(body);
    if (notificacion) {
      if (notificacion.aprobada === false) {
        return NextResponse.json({ received: true, ok: false }, { status: 200 });
      }

      // Con id de transacción se re-verifica el cobro contra la API de PayPhone.
      let resultado: ResultadoConfirmacion;
      if (notificacion.payphoneId) {
        resultado = await confirmarPago(notificacion.payphoneId, notificacion.clientTxId);
      } else if (notificacion.aprobada) {
        resultado = await aprobarPagoNotificado(notificacion.clientTxId, notificacion.montoCentavos);
      } else {
        console.warn('[WEBHOOK] Notificación sin id de transacción ni estado aprobado.');
        return NextResponse.json({ received: true, ok: false }, { status: 200 });
      }

      if (!resultado.ok) {
        console.warn('[WEBHOOK] Pago no confirmado:', resultado.motivo);
      }
      const reintentar = !resultado.ok && (resultado.motivo === 'payphone_error' || resultado.motivo === 'error_matricula');
      return NextResponse.json({ received: true, ok: resultado.ok }, { status: reintentar ? 500 : 200 });
    }

    // Avisos de otras pasarelas con email + curso.
    if (transaccionRechazada(body)) {
      return NextResponse.json({ received: true, ok: false }, { status: 200 });
    }
    const datos = extraerDatosPago(body);
    if (!datos) {
      console.warn('[WEBHOOK] Cuerpo sin clientTransactionId ni email/curso.');
      return NextResponse.json({ error: 'Falta clientTransactionId' }, { status: 400 });
    }

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
