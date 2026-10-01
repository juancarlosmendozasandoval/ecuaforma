import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { ListVideo } from 'lucide-react';
import Breadcrumbs from '../../../../components/Breadcrumbs';
import {
  aplanarLecciones,
  cargarTemarioCurso,
  CAMPOS_BANCO_AULA,
  tituloLeccionTemario,
  type LeccionPlana,
} from '@/lib/cursos/temario';
import { tieneMatricula } from '@/lib/cursos/acceso';
import { createAdminClient } from '@/lib/supabase/admin';
import AulaCliente, { type LeccionAula } from './AulaCliente';
import ListaTemario, { type ItemTemarioVista } from './ListaTemario';
import TemarioMovil from './TemarioMovil';
import CajaTemario from './CajaTemario';

export const dynamic = 'force-dynamic';

type Vecina = { id: string; titulo: string } | null;

function hrefLeccion(institucion: string, slug: string, id: string) {
  return `/cursos/${institucion}/${slug}/${id}`;
}

/** Botones de la secuencia. Si no hay vecina, el botón queda visible y deshabilitado. */
function NavegacionLeccion({
  institucion,
  slug,
  anterior,
  siguiente,
  compacta = false,
}: {
  institucion: string;
  slug: string;
  anterior: Vecina;
  siguiente: Vecina;
  compacta?: boolean;
}) {
  const base = compacta
    ? 'inline-flex items-center justify-center rounded-xl px-3 py-2 text-sm font-bold transition-colors'
    : 'flex min-h-[72px] items-center gap-3 rounded-2xl px-4 py-4 text-base font-bold shadow-sm transition-colors';

  const anteriorClase = anterior
    ? `${base} border border-gray-200 bg-white text-gray-800 hover:border-blue-400 hover:text-blue-700`
    : `${base} cursor-not-allowed border border-gray-100 bg-gray-50 text-gray-300`;

  const siguienteClase = siguiente
    ? `${base} bg-blue-600 text-white shadow-md hover:bg-blue-700`
    : `${base} cursor-not-allowed bg-gray-200 text-gray-400 shadow-none`;

  const contenidoAnterior = compacta ? (
    '← Anterior'
  ) : (
    <span className="min-w-0 text-left">
      <span className="block">← Anterior</span>
      {anterior && <span className="mt-0.5 block truncate text-xs font-semibold opacity-80">{anterior.titulo}</span>}
    </span>
  );

  const contenidoSiguiente = compacta ? (
    'Siguiente →'
  ) : (
    <span className="min-w-0 text-right">
      <span className="block">Siguiente →</span>
      {siguiente && <span className="mt-0.5 block truncate text-xs font-semibold text-blue-100">{siguiente.titulo}</span>}
    </span>
  );

  return (
    <div className={compacta ? 'flex items-center justify-between gap-3' : 'grid grid-cols-2 gap-3'}>
      {anterior ? (
        <Link href={hrefLeccion(institucion, slug, anterior.id)} className={anteriorClase}>
          {contenidoAnterior}
        </Link>
      ) : (
        <span className={anteriorClase} aria-disabled="true">
          ← Anterior
        </span>
      )}
      {siguiente ? (
        <Link href={hrefLeccion(institucion, slug, siguiente.id)} className={`${siguienteClase} ${compacta ? '' : 'justify-end'}`}>
          {contenidoSiguiente}
        </Link>
      ) : (
        <span className={`${siguienteClase} ${compacta ? '' : 'justify-end'}`} aria-disabled="true">
          Siguiente →
        </span>
      )}
    </div>
  );
}

function aVista(leccion: LeccionPlana, completadas: Set<string>): ItemTemarioVista {
  return {
    id: leccion.id,
    numero: leccion.numero,
    titulo: tituloLeccionTemario(leccion),
    moduloId: leccion.modulo.id,
    moduloTitulo: leccion.modulo.titulo || 'Módulo',
    completada: completadas.has(leccion.id),
  };
}

function aAula(leccion: LeccionPlana): LeccionAula {
  const banco = leccion.banco_lecciones;
  return {
    id: leccion.id,
    numero: leccion.numero,
    titulo: tituloLeccionTemario(leccion),
    moduloTitulo: leccion.modulo.titulo || 'Módulo',
    videoUrl: banco?.video_url || null,
    simuladorId: banco?.simulador_id || null,
    contenidoHtml: banco?.contenido_html || null,
    adjuntos: banco?.adjuntos || null,
  };
}

export default async function AulaVirtualPage({
  params,
}: {
  params: { institucion: string; slug: string; leccionId: string };
}) {
  const cookieStore = cookies();
  const supabase = createServerComponentClient({ cookies: () => cookieStore });

  const { data: curso } = await supabase
    .from('cursos')
    .select('*')
    .eq('slug', params.slug)
    .eq('is_deleted', false)
    .single();

  if (!curso) return <div className="p-10 text-center">Curso no encontrado.</div>;

  const ventaHref = `/cursos/${params.institucion}/${params.slug}`;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !(await tieneMatricula(user.id, curso.id))) redirect(ventaHref);

  const modulos = await cargarTemarioCurso(createAdminClient(), curso.id, CAMPOS_BANCO_AULA);
  const lecciones = aplanarLecciones(modulos);
  const indice = lecciones.findIndex((leccion) => leccion.id === params.leccionId);

  if (indice < 0) return <div className="p-10 text-center">Contenido no encontrado.</div>;

  const actual = lecciones[indice];

  const anterior = indice > 0 ? lecciones[indice - 1] : null;
  const siguiente = indice < lecciones.length - 1 ? lecciones[indice + 1] : null;
  const vecina = (leccion: LeccionPlana | null): Vecina =>
    leccion ? { id: leccion.id, titulo: tituloLeccionTemario(leccion) } : null;

  const completadas = new Set<string>();
  if (lecciones.length > 0) {
    const { data: progreso } = await supabase
      .from('progreso_lecciones')
      .select('leccion_id')
      .eq('usuario_id', user.id)
      .in('leccion_id', lecciones.map((leccion) => leccion.id));
    for (const fila of progreso || []) completadas.add(fila.leccion_id);
  }

  const items = lecciones.map((leccion) => aVista(leccion, completadas));
  const hrefBase = `/cursos/${params.institucion}/${params.slug}`;
  const aula = aAula(actual);

  const breadcrumbs = [
    { label: 'Inicio', href: '/' },
    { label: `Cursos ${curso.institucion || ''}`, href: `/cursos/${params.institucion}` },
    { label: curso.nombre || '', href: hrefBase },
    { label: aula.moduloTitulo },
  ];

  return (
    <div className="main-container relative min-h-screen bg-gray-50/50 py-2 sm:py-6">
      <Breadcrumbs items={breadcrumbs} />

      <div className="mt-4 lg:flex lg:items-start lg:gap-6">
        <div className="min-w-0 w-full space-y-4 lg:flex-1">
          <TemarioMovil
            items={items}
            actualId={actual.id}
            hrefBase={hrefBase}
            numeroActual={actual.numero}
            total={lecciones.length}
            completadas={completadas.size}
          />

          <NavegacionLeccion
            institucion={params.institucion}
            slug={params.slug}
            anterior={vecina(anterior)}
            siguiente={vecina(siguiente)}
            compacta
          />

          <AulaCliente leccion={aula} completadaInicial={completadas.has(actual.id)} />

          <NavegacionLeccion
            institucion={params.institucion}
            slug={params.slug}
            anterior={vecina(anterior)}
            siguiente={vecina(siguiente)}
          />
        </div>

        <aside className="hidden lg:block lg:w-1/4 lg:sticky lg:top-24 lg:self-start overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="flex items-center justify-between bg-slate-900 px-4 py-4 text-white">
            <div className="flex items-center gap-2">
              <ListVideo className="h-5 w-5" />
              <h2 className="font-bold">Contenido</h2>
            </div>
            <span className="rounded-md bg-slate-800 px-2 py-1 text-xs font-bold text-indigo-300">
              {completadas.size} / {lecciones.length}
            </span>
          </div>
          <CajaTemario activoId={actual.id}>
            <ListaTemario items={items} actualId={actual.id} hrefBase={hrefBase} />
          </CajaTemario>
        </aside>
      </div>
    </div>
  );
}
