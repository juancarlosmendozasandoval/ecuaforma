import { requireAdmin } from '@/lib/auth/requireAdmin';
import { cargarInstituciones, cargarMateriasSelector, cargarTemasSelector } from '@/lib/simuladores/temasSelector';
import CrearSimuladorCliente from './CrearSimuladorCliente';

export const dynamic = 'force-dynamic';

export default async function CrearSimuladorPage() {
  const { supabase } = await requireAdmin();
  const [temas, materias, instituciones] = await Promise.all([
    cargarTemasSelector(supabase),
    cargarMateriasSelector(supabase),
    cargarInstituciones(supabase),
  ]);
  return <CrearSimuladorCliente temas={temas} materias={materias} instituciones={instituciones} />;
}
