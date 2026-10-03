import { permanentRedirect } from 'next/navigation';

/**
 * URLs del catálogo antiguo de tres niveles (institución/categoría/materia).
 * Redirige a la página de la materia; esa página traduce la categoría antigua.
 */
export default function SubtemaAntiguoPage({ params }: { params: { institucion: string; materia: string } }) {
  permanentRedirect(`/simuladores/${params.institucion}/${params.materia}`);
}
