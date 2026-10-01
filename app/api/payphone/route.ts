import { NextResponse } from 'next/server';
import axios from 'axios';
import { randomUUID } from 'crypto';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';

const SITE_URL = 'https://www.ecuaforma.com';
const PAYPHONE_STORE_ID = 'f2a3b1bc-f8bd-4d5a-9d5a-22648de632b4';
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Prepara un cobro de PayPhone para un curso.
 * El cliente solo envía `cursoId`; el monto, el usuario y la referencia se
 * determinan en el servidor y quedan registrados en `pagos` como 'pendiente'.
 */
export async function POST(request: Request) {
  try {
    // 1. Usuario autenticado (obligatorio para poder matricularlo después)
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Debes iniciar sesión para pagar.' }, { status: 401 });
    }

    // 2. Validar la entrada: únicamente un UUID de curso
    const body = await request.json().catch(() => null);
    const cursoId = body?.cursoId;
    if (typeof cursoId !== 'string' || !UUID_REGEX.test(cursoId)) {
      return NextResponse.json({ error: 'Curso inválido.' }, { status: 400 });
    }

    const token = process.env.PAYPHONE_TOKEN?.trim();
    if (!token) {
      return NextResponse.json({ error: 'Falta configurar el Token' }, { status: 500 });
    }

    // 3. Precio oficial desde la base de datos
    const admin = createAdminClient();
    const { data: curso } = await admin
      .from('cursos')
      .select('id, nombre, institucion, precio, es_pago, is_deleted')
      .eq('id', cursoId)
      .single();

    if (!curso || curso.is_deleted || !(Number(curso.precio) > 0)) {
      return NextResponse.json({ error: 'Este curso no está disponible para pago.' }, { status: 400 });
    }

    // Evita cobrar dos veces a quien ya tiene acceso
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
    const clientTxId = `EC${randomUUID().replace(/-/g, '')}`; // 34 caracteres, no adivinable

    // 4. Registrar el intento antes de hablar con el banco
    const { error: errorPago } = await admin.from('pagos').insert({
      usuario_id: user.id,
      curso_id: curso.id,
      client_tx_id: clientTxId,
      monto_centavos: montoCentavos,
    });
    if (errorPago) {
      console.error('[PAYPHONE] No se pudo registrar el pago', errorPago.code);
      return NextResponse.json({ error: 'No se pudo iniciar el pago.' }, { status: 500 });
    }

    const rawReference = curso.institucion ? `${curso.nombre || ''} (${curso.institucion})` : curso.nombre || 'Ecuaforma';
    const safeReference = rawReference
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9 ()-]/g, '')
      .substring(0, 50);

    const payphoneBody = {
      amount: montoCentavos,
      amountWithoutTax: montoCentavos,
      amountWithTax: 0,
      tax: 0,
      service: 0,
      tip: 0,
      currency: 'USD',
      clientTransactionId: clientTxId,
      reference: safeReference,
      storeId: PAYPHONE_STORE_ID,
      // PayPhone agrega ?id=...&clientTransactionId=... a esta URL
      responseUrl: `${SITE_URL}/mis-cursos`,
      cancellationUrl: `${SITE_URL}/checkout?curso=${curso.id}&cancelado=1`,
      optionalParameter1: user.id,
      optionalParameter2: curso.id,
    };

    const response = await axios.post('https://pay.payphonetodoesposible.com/api/button/Prepare', payphoneBody, {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
      validateStatus: (status) => status >= 200 && status < 600,
    });

    if (typeof response.data === 'string' && response.data.includes('<html')) {
      console.error('[PAYPHONE] Prepare devolvió HTML. Estado:', response.status);
      return NextResponse.json({ error: 'Error del banco. Revisa los logs.' }, { status: 500 });
    }

    if (response.status !== 200) {
      return NextResponse.json({ error: response.data?.message || 'Error en PayPhone' }, { status: 400 });
    }

    const linkDePago = response.data?.payWithCard || response.data?.payWithPayPhone;
    if (!linkDePago) {
      return NextResponse.json({ error: 'Respuesta incompleta del banco' }, { status: 500 });
    }

    return NextResponse.json({ url: linkDePago });
  } catch (error) {
    console.error('[PAYPHONE] Error crítico interno:', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'Error procesando el pago' }, { status: 500 });
  }
}
