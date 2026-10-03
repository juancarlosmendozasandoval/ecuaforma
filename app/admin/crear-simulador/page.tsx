import { requireAdmin } from '@/lib/auth/requireAdmin';
import { cargarTemasSelector } from '@/lib/simuladores/temasSelector';
import CrearSimuladorCliente from './CrearSimuladorCliente';

export const dynamic = 'force-dynamic';

export default async function CrearSimuladorPage() {
  const { supabase } = await requireAdmin();
  const temas = await cargarTemasSelector(supabase);
  return <CrearSimuladorCliente temas={temas} />;
}
