import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import ConstructorModulos from './ConstructorModulos';
import { SELECT_LECCION_BANCO, type LeccionBanco, type ModuloConContenido } from './tipos';

export const dynamic = 'force-dynamic';

/**
 * Constructor de módulos (carpetas) de un curso.
 * Carga en el servidor el curso, sus carpetas con su contenido y el banco
 * completo de lecciones; la interacción la maneja <ConstructorModulos />.
 */
export default async function ConstructorCursoPage({ params }: { params: { slug: string } }) {
  const { supabase } = await requireAdmin();

  const { data: curso } = await supabase
    .from('cursos')
    .select('id, nombre, slug, institucion')
    .eq('slug', params.slug)
    .single();

  if (!curso) notFound();

  const [{ data: modulosData }, { data: bancoData }] = await Promise.all([
    supabase
      .from('modulos_curso')
      .select(
        `id, titulo, orden, curso_id, created_at,
         contenido_modulos ( id, orden, titulo_mostrar, is_preview, leccion_id, modulo_id,
           banco_lecciones ( ${SELECT_LECCION_BANCO} ) )`
      )
      .eq('curso_id', curso.id)
      .order('orden', { ascending: true }),
    supabase
      .from('banco_lecciones')
      .select(SELECT_LECCION_BANCO)
      .order('created_at', { ascending: false }),
  ]);

  // El cliente no tipado infiere `banco_lecciones` como arreglo; PostgREST devuelve un objeto (relación N:1).
  const modulos = ((modulosData || []) as unknown as ModuloConContenido[]).map((modulo) => ({
    ...modulo,
    contenido_modulos: [...(modulo.contenido_modulos || [])].sort((a, b) => a.orden - b.orden),
  }));

  return (
    <ConstructorModulos
      curso={{
        id: curso.id,
        nombre: curso.nombre || '',
        slug: curso.slug || params.slug,
        institucion: curso.institucion || '',
      }}
      modulosIniciales={modulos}
      bancoLecciones={(bancoData || []) as LeccionBanco[]}
    />
  );
}
