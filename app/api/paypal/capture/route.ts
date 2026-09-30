import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import { getPayPalAccessToken, paypalApiBase } from '@/lib/pagos/paypal';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Captura una orden de PayPal y matricula solo si el cobro coincide
 * con el registro pendiente de `pagos` (monto y custom_id).
 */
export async function POST(request: Request) {
  try {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Debes iniciar sesión para pagar.' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const orderID = body?.orderID;
    const pagoId = body?.pagoId || body?.pagoInternoId;
    const clientTxId = body?.clientTxId;

    if (typeof orderID !== 'string' || !/^[A-Z0-9]{10,20}$/i.test(orderID)) {
      return NextResponse.json({ error: 'Orden de PayPal inválida.' }, { status: 400 });
    }
    if (pagoId && (typeof pagoId !== 'string' || !UUID_REGEX.test(pagoId))) {
      return NextResponse.json({ error: 'Pago inválido.' }, { status: 400 });
    }
    if (!pagoId && (typeof clientTxId !== 'string' || !clientTxId.trim())) {
      return NextResponse.json({ error: 'Falta el identificador del pago.' }, { status: 400 });
    }

    const admin = createAdminClient();
    const consulta = admin.from('pagos').select('id, usuario_id, curso_id, monto_centavos, estado');
    const { data: pago } = pagoId
      ? await consulta.eq('id', pagoId).maybeSingle()
      : await consulta.eq('client_tx_id', String(clientTxId).trim()).maybeSingle();

    if (!pago || pago.usuario_id !== user.id) {
      return NextResponse.json({ error: 'Pago no encontrado.' }, { status: 404 });
    }

    const token = await getPayPalAccessToken();
    const captura = await fetch(`${paypalApiBase()}/v2/checkout/orders/${orderID}/capture`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });
    const data = await captura.json().catch(() => null);

    const unidad = data?.purchase_units?.[0];
    const cobro = unidad?.payments?.captures?.[0];
    const montoCobrado = Math.round(Number(cobro?.amount?.value) * 100);
    const coincide =
      data?.status === 'COMPLETED' &&
      cobro?.status === 'COMPLETED' &&
      unidad?.custom_id === pago.id &&
      cobro?.amount?.currency_code === 'USD' &&
      montoCobrado === pago.monto_centavos;

    // Un segundo intento sobre una orden ya cobrada y un pago ya aprobado no es un fallo
    const yaConfirmado = pago.estado === 'aprobado' && !captura.ok;
    if (!yaConfirmado && (!captura.ok || !coincide)) {
      console.error('[PAYPAL] Captura no válida', captura.status, data?.status);
      await admin.from('pagos').update({ estado: 'rechazado' }).eq('id', pago.id).eq('estado', 'pendiente');
      return NextResponse.json({ error: 'PayPal no confirmó el cobro por el monto del curso.' }, { status: 402 });
    }

    // Solo una llamada gana el paso de pendiente → aprobado
    const { data: ganado } = await admin
      .from('pagos')
      .update({ estado: 'aprobado', confirmado_en: new Date().toISOString() })
      .eq('id', pago.id)
      .eq('estado', 'pendiente')
      .select('id')
      .maybeSingle();

    if (!ganado && pago.estado !== 'aprobado') {
      const { data: actual } = await admin.from('pagos').select('estado').eq('id', pago.id).maybeSingle();
      if (actual?.estado !== 'aprobado') {
        return NextResponse.json({ error: 'No se pudo confirmar el pago.' }, { status: 409 });
      }
    }

    const { error: errorAcceso } = await admin.from('accesos_cursos').upsert(
      { usuario_id: pago.usuario_id, curso_id: pago.curso_id },
      { onConflict: 'usuario_id,curso_id', ignoreDuplicates: true }
    );
    if (errorAcceso) {
      console.error('[PAYPAL] Cobro aprobado sin matrícula', pago.id, errorAcceso.code);
      return NextResponse.json({ error: 'El pago se cobró, pero no se pudo activar el curso. Contáctanos.' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[PAYPAL] Error al capturar:', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'Error procesando el pago' }, { status: 500 });
  }
}
