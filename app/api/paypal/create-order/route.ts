import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import { getPayPalAccessToken, paypalApiBase } from '@/lib/pagos/paypal';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Crea una orden de PayPal por el precio oficial del curso.
 * El cliente solo envía `cursoId`. El monto queda registrado en `pagos`.
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
    const cursoId = body?.cursoId;
    if (typeof cursoId !== 'string' || !UUID_REGEX.test(cursoId)) {
      return NextResponse.json({ error: 'Curso inválido.' }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: curso } = await admin
      .from('cursos')
      .select('id, nombre, precio, es_pago, is_deleted')
      .eq('id', cursoId)
      .maybeSingle();

    if (!curso || curso.is_deleted || !curso.es_pago || !(Number(curso.precio) > 0)) {
      return NextResponse.json({ error: 'Este curso no está disponible para pago.' }, { status: 400 });
    }

    const { data: accesoPrevio } = await admin
      .from('accesos_cursos')
      .select('id')
      .eq('usuario_id', user.id)
      .eq('curso_id', curso.id)
      .maybeSingle();
    if (accesoPrevio) {
      return NextResponse.json({ error: 'Ya tienes acceso a este curso.' }, { status: 409 });
    }

    const montoCentavos = Math.round(Number(curso.precio) * 100);
    const clientTxId = `PP${randomUUID().replace(/-/g, '')}`;

    const { data: pago, error: errorPago } = await admin
      .from('pagos')
      .insert({
        usuario_id: user.id,
        curso_id: curso.id,
        client_tx_id: clientTxId,
        monto_centavos: montoCentavos,
      })
      .select('id')
      .single();

    if (errorPago || !pago) {
      console.error('[PAYPAL] No se pudo registrar el pago', errorPago?.code);
      return NextResponse.json({ error: 'No se pudo iniciar el pago.' }, { status: 500 });
    }

    const token = await getPayPalAccessToken();
    const orden = await fetch(`${paypalApiBase()}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [
          {
            custom_id: pago.id,
            description: (curso.nombre || 'Curso Ecuaforma').slice(0, 127),
            amount: {
              currency_code: 'USD',
              value: (montoCentavos / 100).toFixed(2),
            },
          },
        ],
      }),
      cache: 'no-store',
    });

    const ordenData = await orden.json().catch(() => null);
    if (!orden.ok || !ordenData?.id) {
      await admin.from('pagos').update({ estado: 'rechazado' }).eq('id', pago.id).eq('estado', 'pendiente');
      console.error('[PAYPAL] Create order falló', orden.status);
      return NextResponse.json({ error: 'PayPal no pudo crear la orden.' }, { status: 502 });
    }

    return NextResponse.json({ orderID: ordenData.id, pagoId: pago.id });
  } catch (error) {
    console.error('[PAYPAL] Error al crear la orden:', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'Error procesando el pago' }, { status: 500 });
  }
}
