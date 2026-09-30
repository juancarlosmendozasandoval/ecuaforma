import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';

const PAYPHONE_CONFIRM_URL = 'https://pay.payphonetodoesposible.com/api/button/V2/Confirm';

/** Fila de la tabla `pagos` (aún no está en types/supabase.ts hasta regenerar los tipos). */
export type Pago = {
  id: string;
  usuario_id: string;
  curso_id: string;
  client_tx_id: string;
  monto_centavos: number;
  estado: 'pendiente' | 'aprobado' | 'rechazado';
  payphone_id: number | null;
  creado_en: string;
  confirmado_en: string | null;
};

export type ResultadoConfirmacion =
  | { ok: true; pago: Pago; yaProcesado: boolean }
  | { ok: false; motivo: 'pago_desconocido' | 'payphone_error' | 'no_aprobado' | 'error_matricula'; pago?: Pago };

/**
 * Confirma una transacción de PayPhone contra el registro interno en `pagos`
 * y matricula al usuario. Es idempotente: webhook y redirección pueden llamarla
 * varias veces, a la vez, sin duplicar accesos.
 *
 * El curso, el usuario y el monto salen SIEMPRE de `pagos`, nunca de la petición.
 */
export async function confirmarPago(payphoneId: number, clientTxId: string): Promise<ResultadoConfirmacion> {
  if (!Number.isInteger(payphoneId) || payphoneId <= 0 || !clientTxId) {
    return { ok: false, motivo: 'pago_desconocido' };
  }

  const admin = createAdminClient();

  const { data: pagoData } = await admin.from('pagos').select('*').eq('client_tx_id', clientTxId).maybeSingle();
  const pago = pagoData as Pago | null;
  if (!pago) return { ok: false, motivo: 'pago_desconocido' };

  const yaProcesado = pago.estado === 'aprobado';

  if (!yaProcesado) {
    // 1. Verificar con PayPhone (la única fuente de verdad sobre el cobro)
    let data: any = null;
    try {
      const res = await fetch(PAYPHONE_CONFIRM_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.PAYPHONE_TOKEN?.trim() || ''}`,
        },
        body: JSON.stringify({ id: payphoneId, clientTxId }),
        cache: 'no-store',
      });
      data = await res.json().catch(() => null);
    } catch (error) {
      console.error('[PAGO] Error de red con PayPhone', pago.id);
    }

    // Sin respuesta interpretable no se marca nada: un reintento podrá confirmarlo
    if (!data?.transactionStatus) return { ok: false, motivo: 'payphone_error', pago };

    const valido =
      data.transactionStatus === 'Approved' &&
      data.clientTransactionId === clientTxId &&
      Number(data.amount) === pago.monto_centavos &&
      (data.currency || 'USD') === 'USD';

    if (!valido) {
      console.warn('[PAGO] No aprobado o no coincide', pago.id, data.transactionStatus);
      await admin
        .from('pagos')
        .update({ estado: 'rechazado', payphone_id: payphoneId })
        .eq('id', pago.id)
        .eq('estado', 'pendiente');
      return { ok: false, motivo: 'no_aprobado', pago };
    }

    // 2. Transición atómica → aprobado. Si dos llamadas llegan a la vez, solo una actualiza;
    //    la otra no encuentra fila en estado pendiente/rechazado y continúa sin efecto.
    await admin
      .from('pagos')
      .update({ estado: 'aprobado', payphone_id: payphoneId, confirmado_en: new Date().toISOString() })
      .eq('id', pago.id)
      .in('estado', ['pendiente', 'rechazado']);
  }

  // 3. Matrícula idempotente (índice único usuario_id + curso_id). Se ejecuta también
  //    en pagos ya aprobados para reparar una matrícula que hubiera fallado antes.
  const { error } = await admin
    .from('accesos_cursos')
    .upsert(
      { usuario_id: pago.usuario_id, curso_id: pago.curso_id },
      { onConflict: 'usuario_id,curso_id', ignoreDuplicates: true }
    );

  if (error) {
    console.error('[PAGO APROBADO SIN MATRÍCULA]', pago.id, error.code);
    return { ok: false, motivo: 'error_matricula', pago };
  }

  return { ok: true, pago: { ...pago, estado: 'aprobado' }, yaProcesado };
}
