import { requireAdmin } from '@/lib/auth/requireAdmin';
import BancoLeccionesCliente, { type RecursoBanco, type SimuladorOpcion } from './BancoLeccionesCliente';

export const dynamic = 'force-dynamic';

/**
 * Almacén Central: CRUD global de `banco_lecciones`.
 * Carga en el servidor los recursos (con cuántas carpetas los usan) y los
 * simuladores disponibles; la interacción la maneja <BancoLeccionesCliente />.
 */
export default async function BancoLeccionesPage() {
  const { supabase } = await requireAdmin();

  const [{ data: recursosData }, { data: simuladoresData }] = await Promise.all([
    supabase
      .from('banco_lecciones')
      .select('id, titulo_interno, tipo, video_url, simulador_id, contenido_html, adjuntos, created_at, contenido_modulos ( id )')
      .order('created_at', { ascending: false }),
    supabase
      .from('simuladores')
      .select('id, nombre, institucion, materia')
      .eq('is_deleted', false)
      .order('created_at', { ascending: false }),
  ]);

  const recursos: RecursoBanco[] = (recursosData || []).map(({ contenido_modulos, ...recurso }) => ({
    ...(recurso as Omit<RecursoBanco, 'usos'>),
    usos: (contenido_modulos || []).length,
  }));

  return (
    <BancoLeccionesCliente
      recursosIniciales={recursos}
      simuladores={(simuladoresData || []) as SimuladorOpcion[]}
    />
  );
}
