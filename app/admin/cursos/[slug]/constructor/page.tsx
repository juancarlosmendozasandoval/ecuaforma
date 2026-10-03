import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import ConstructorModulos from './ConstructorModulos';
import { SELECT_LECCION_BANCO, SELECT_MODULO, type LeccionBanco, type ModuloConContenido } from './tipos';

export const dynamic = 'force-dynamic';

/**
 * Constructor de módulos (carpetas) de un curso: módulos principales → submódulos → lecciones.
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

  const [{ data: modulosData, error: errorModulos }, { data: bancoData }] = await Promise.all([
    supabase
      .from('modulos_curso')
      .select(
        `${SELECT_MODULO},
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

  if (errorModulos) {
    console.error('Error al cargar los módulos del curso:', errorModulos);
    return (
      <div className="max-w-3xl mx-auto my-10 p-6 rounded-2xl border border-rose-200 bg-rose-50 text-rose-800">
        <p className="font-bold">No se pudieron cargar las carpetas del curso.</p>
        <p className="text-sm mt-1">
          {errorModulos.code === '42703'
            ? 'Falta la columna modulos_curso.parent_id: ejecuta la migración de módulos jerárquicos en Supabase.'
            : errorModulos.message || ''}
        </p>
      </div>
    );
  }

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
