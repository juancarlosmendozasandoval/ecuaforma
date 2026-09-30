import { requireAdmin } from '@/lib/auth/requireAdmin';
import type { Materia, Tema } from '@/types/biblioteca';
import CategoriasCliente from './CategoriasCliente';

export const dynamic = 'force-dynamic';

/**
 * Gestor de la taxonomía de la biblioteca: materias y sus temas.
 * La sesión de admin la exige requireAdmin antes de leer los catálogos.
 */
export default async function CategoriasPage() {
  const { supabase } = await requireAdmin();

  const [{ data: materiasData }, { data: temasData }] = await Promise.all([
    supabase.from('materias').select('id, nombre, slug, descripcion, orden, created_at').order('orden').order('nombre'),
    supabase.from('temas').select('id, materia_id, nombre, slug, orden, created_at').order('orden').order('nombre'),
  ]);

  const materias = (materiasData || []) as Materia[];
  const temas = (temasData || []) as Tema[];

  return <CategoriasCliente materiasIniciales={materias} temasIniciales={temas} />;
}
