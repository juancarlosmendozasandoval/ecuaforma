import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import Link from 'next/link';
import {
  ArrowLeft, Layers, Folder, BookOpen, Users, Globe, EyeOff, DollarSign, Gift, ExternalLink, ImageIcon,
} from 'lucide-react';
import type { Tables } from '@/types/supabase';

export const dynamic = 'force-dynamic';

/**
 * Ficha del curso en el admin. El temario se gestiona exclusivamente
 * desde el Constructor de Módulos (/admin/cursos/[slug]/constructor).
 */
export default async function AdminDetalleCursoPage({ params }: { params: { slug: string } }) {
  const { supabase } = await requireAdmin();

  const { data } = await supabase.from('cursos').select('*').eq('slug', params.slug).single();
  const curso = data as Tables<'cursos'> | null;
  if (!curso) notFound();

  const [{ count: totalModulos }, { count: totalLecciones }, { count: totalEstudiantes }] = await Promise.all([
    supabase.from('modulos_curso').select('id', { count: 'exact', head: true }).eq('curso_id', curso.id),
    supabase
      .from('contenido_modulos')
      .select('id, modulos_curso!inner ( curso_id )', { count: 'exact', head: true })
      .eq('modulos_curso.curso_id', curso.id),
    supabase.from('accesos_cursos').select('id', { count: 'exact', head: true }).eq('curso_id', curso.id),
  ]);

  const institucionSlug = (curso.institucion || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  const estadisticas = [
    { label: 'Módulos', valor: totalModulos || 0, icon: Folder },
    { label: 'Lecciones', valor: totalLecciones || 0, icon: BookOpen },
    { label: 'Estudiantes', valor: totalEstudiantes || 0, icon: Users },
  ];

  return (
    <div className="max-w-4xl mx-auto py-6 space-y-6">
      <Link href="/admin/cursos" className="text-gray-500 hover:text-indigo-600 flex items-center gap-1 text-sm font-medium transition-colors w-fit">
        <ArrowLeft size={16} /> Volver a Cursos
      </Link>

      {/* Detalles del curso */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex flex-col md:flex-row">
          <div className="md:w-64 h-48 md:h-auto bg-slate-100 flex items-center justify-center shrink-0">
            {curso.imagen_url ? (
              <img src={curso.imagen_url} alt={curso.nombre || 'Curso'} className="w-full h-full object-cover" />
            ) : (
              <ImageIcon className="w-12 h-12 text-slate-300" />
            )}
          </div>

          <div className="p-6 flex-1 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-bold uppercase bg-blue-50 text-blue-600 px-2.5 py-1 rounded-md border border-blue-100">
                {curso.institucion || 'Sin institución'}
              </span>
              {curso.publico ? (
                <span className="text-[11px] font-bold uppercase bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-md border border-emerald-100 flex items-center gap-1">
                  <Globe size={12} /> Público
                </span>
              ) : (
                <span className="text-[11px] font-bold uppercase bg-gray-100 text-gray-500 px-2.5 py-1 rounded-md border border-gray-200 flex items-center gap-1">
                  <EyeOff size={12} /> Oculto
                </span>
              )}
              {curso.es_pago ? (
                <span className="text-[11px] font-bold uppercase bg-amber-50 text-amber-700 px-2.5 py-1 rounded-md border border-amber-100 flex items-center gap-1">
                  <DollarSign size={12} /> ${curso.precio || 0} USD
                </span>
              ) : (
                <span className="text-[11px] font-bold uppercase bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded-md border border-indigo-100 flex items-center gap-1">
                  <Gift size={12} /> Gratis
                </span>
              )}
            </div>

            <div>
              <h1 className="text-2xl font-bold text-gray-800">{curso.nombre || 'Curso sin nombre'}</h1>
              <p className="text-xs text-gray-400 font-mono mt-1">/{curso.slug || params.slug}</p>
            </div>

            <p className="text-sm text-gray-600 leading-relaxed">
              {curso.descripcion || 'Este curso aún no tiene descripción.'}
            </p>

            <Link
              href={`/cursos/${institucionSlug}/${curso.slug || params.slug}`}
              target="_blank"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:underline"
            >
              <ExternalLink size={14} /> Ver como estudiante
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-3 border-t border-gray-100 divide-x divide-gray-100">
          {estadisticas.map(({ label, valor, icon: Icon }) => (
            <div key={label} className="p-4 text-center">
              <Icon className="w-5 h-5 text-indigo-400 mx-auto mb-1" />
              <p className="text-2xl font-bold text-gray-800">{valor}</p>
              <p className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Acceso al constructor */}
      <div className="bg-slate-900 rounded-2xl p-10 text-center shadow-lg">
        <Layers className="w-12 h-12 text-indigo-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-white">Temario del curso</h2>
        <p className="text-slate-400 text-sm mt-2 mb-8 max-w-md mx-auto">
          Organiza las carpetas y asigna lecciones del Banco de Lecciones desde el constructor.
        </p>
        <Link
          href={`/admin/cursos/${params.slug}/constructor`}
          className="inline-flex items-center gap-3 bg-indigo-600 hover:bg-indigo-500 text-white px-10 py-4 rounded-2xl font-bold text-lg shadow-xl transition-all hover:-translate-y-0.5"
        >
          <Layers className="w-6 h-6" /> Abrir Constructor de Módulos
        </Link>
      </div>
    </div>
  );
}
