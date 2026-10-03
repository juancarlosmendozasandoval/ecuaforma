import { FECHA_ACTUALIZACION_LEGAL } from '@/lib/legales/documentos';
import NavLegales from './NavLegales';

/** Marco de lectura común para los documentos legales: centrado y con tipografía `prose`. */
export default function LegalesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="main-container max-w-3xl">
      <NavLegales />

      <article
        className="prose prose-slate mt-6 max-w-none rounded-2xl border border-gray-100 bg-white p-6 shadow-sm sm:p-10
          prose-headings:text-gray-900 prose-h1:text-3xl prose-h1:font-black prose-h2:mt-10 prose-h2:text-xl
          prose-a:text-primary prose-li:my-1"
      >
        {children}
        <hr />
        <p className="text-sm text-gray-500">Última actualización: {FECHA_ACTUALIZACION_LEGAL}.</p>
      </article>
    </div>
  );
}
