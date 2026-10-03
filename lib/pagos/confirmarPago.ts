import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { avisarBienvenidaPago } from './avisoBienvenida';

const PAYPHONE_CONFIRM_URL = 'https://pay.payphonetodoesposible.com/api/button/V2/Confirm';

/** Fila de la tabla `pagos` (aún no está en types/supabase.ts hasta regenerar los tipos). */
export type Pago = {
  id: string;
  /** null si el usuario eliminó su cuenta: el pago se conserva solo como registro contable. */
  usuario_id: string | null;
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
  let aprobadoAhora = false;

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

    aprobadoAhora = await marcarAprobado(admin, pago.id, payphoneId);
  }

  return matricular(admin, pago, yaProcesado, aprobadoAhora);
}

/**
 * Notificación de PayPhone que no trae el id de transacción, así que no se puede
 * re-verificar con su API. Solo la acepta el webhook autenticado con el secreto,
 * y el monto, si viene, debe coincidir con el registrado en `pagos`.
 */
export async function aprobarPagoNotificado(
  clientTxId: string,
  montoCentavos: number | null
): Promise<ResultadoConfirmacion> {
  if (!clientTxId) return { ok: false, motivo: 'pago_desconocido' };

  const admin = createAdminClient();
  const { data: pagoData } = await admin.from('pagos').select('*').eq('client_tx_id', clientTxId).maybeSingle();
  const pago = pagoData as Pago | null;
  if (!pago) return { ok: false, motivo: 'pago_desconocido' };

  const yaProcesado = pago.estado === 'aprobado';
  if (!yaProcesado && montoCentavos !== null && montoCentavos !== pago.monto_centavos) {
    console.warn('[PAGO] El monto notificado no coincide', pago.id);
    return { ok: false, motivo: 'no_aprobado', pago };
  }

  const aprobadoAhora = yaProcesado ? false : await marcarAprobado(admin, pago.id, null);
  return matricular(admin, pago, yaProcesado, aprobadoAhora);
}

/**
 * Transición atómica → aprobado. Si dos llamadas llegan a la vez, solo una
 * actualiza la fila; esa es la única que devuelve true.
 */
async function marcarAprobado(admin: ReturnType<typeof createAdminClient>, pagoId: string, payphoneId: number | null) {
  const cambios: Record<string, unknown> = { estado: 'aprobado', confirmado_en: new Date().toISOString() };
  if (payphoneId) cambios.payphone_id = payphoneId;

  const { data } = await admin
    .from('pagos')
    .update(cambios)
    .eq('id', pagoId)
    .in('estado', ['pendiente', 'rechazado'])
    .select('id');
  return (data || []).length > 0;
}

/**
 * Matrícula idempotente (índice único usuario_id + curso_id). Se ejecuta también
 * en pagos ya aprobados para reparar una matrícula que hubiera fallado antes.
 */
async function matricular(
  admin: ReturnType<typeof createAdminClient>,
  pago: Pago,
  yaProcesado: boolean,
  aprobadoAhora: boolean
): Promise<ResultadoConfirmacion> {
  if (!pago.usuario_id) {
    console.warn('[PAGO DE CUENTA ELIMINADA]', pago.id);
    return { ok: false, motivo: 'error_matricula', pago };
  }

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

  if (aprobadoAhora) avisarBienvenidaPago(pago.usuario_id, pago.curso_id);
  return { ok: true, pago: { ...pago, estado: 'aprobado' }, yaProcesado };
}
