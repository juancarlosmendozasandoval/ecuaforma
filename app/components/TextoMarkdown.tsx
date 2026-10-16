import ReactMarkdown, { type Components, type Options } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkBreaks from 'remark-breaks';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { normalizarLatex, prepararTextoExamen, protegerPrecios, type VarianteTexto } from '@/lib/markdown/prepararTexto';
import rehypeSubrayado from '@/lib/markdown/rehypeSubrayado';

const COMPONENTES_TABLA: Components = {
  a: ({ node, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer" />,
  table: ({ node, ...props }) => (
    <div className="not-prose my-4 overflow-x-auto rounded-xl border border-gray-200">
      <table {...props} className="min-w-full divide-y divide-gray-200 text-sm" />
    </div>
  ),
  th: ({ node, ...props }) => <th {...props} className="bg-gray-50 px-4 py-2.5 text-left font-bold text-gray-700" />,
  td: ({ node, ...props }) => <td {...props} className="border-t border-gray-100 px-4 py-2.5 align-top text-gray-700" />,
};

/** Fuera de `prose`, Tailwind quita márgenes y viñetas: se devuelven aquí. */
const COMPONENTES_BLOQUE: Components = {
  ...COMPONENTES_TABLA,
  p: ({ node, ...props }) => <p {...props} className="mb-3 last:mb-0" />,
  ul: ({ node, ...props }) => <ul {...props} className="mb-3 list-disc space-y-1 pl-6 last:mb-0" />,
  ol: ({ node, ...props }) => <ol {...props} className="mb-3 list-decimal space-y-1 pl-6 last:mb-0" />,
  blockquote: ({ node, ...props }) => <blockquote {...props} className="mb-3 border-l-4 border-gray-300 pl-4 italic last:mb-0" />,
  h1: ({ node, ...props }) => <p {...props} className="mb-2 text-[1.15em] font-bold" />,
  h2: ({ node, ...props }) => <p {...props} className="mb-2 text-[1.1em] font-bold" />,
  h3: ({ node, ...props }) => <p {...props} className="mb-2 font-bold" />,
  h4: ({ node, ...props }) => <p {...props} className="mb-2 font-bold" />,
  strong: ({ node, ...props }) => <strong {...props} className="font-bold" />,
  code: ({ node, ...props }) => <code {...props} className="rounded bg-gray-100 px-1 py-0.5 font-mono text-[0.9em]" />,
};

/** Dentro de un botón: nada de márgenes de bloque ni enlaces (no se anidan elementos interactivos). */
const COMPONENTES_INLINE: Components = {
  p: ({ children }) => <span className="[&+&]:ml-1">{children}</span>,
  a: ({ children }) => <span className="underline">{children}</span>,
  strong: ({ node, ...props }) => <strong {...props} className="font-bold" />,
  code: ({ node, ...props }) => <code {...props} className="rounded bg-black/5 px-1 font-mono text-[0.9em]" />,
};

const GFM: NonNullable<Options['remarkPlugins']>[number] = [remarkGfm, { singleTilde: false }];

type Props = {
  texto: string | null | undefined;
  /** `block`: enunciado y explicación. `inline`: texto de una opción dentro de su botón. */
  variante?: VarianteTexto;
  /**
   * Teoría de lecciones dentro de `prose`: Markdown estándar, solo se protegen los precios
   * (la tipografía la pone `prose` y un salto simple no fuerza `<br>`).
   */
  prosa?: boolean;
};

/** Markdown + tablas GFM + LaTeX (`$…$`, `$$…$$`, `\(…\)`, `\[…\]`) igual en lecciones y simuladores. */
export default function TextoMarkdown({ texto, variante = 'block', prosa = false }: Props) {
  if (!texto) return null;

  if (prosa) {
    return (
      <ReactMarkdown remarkPlugins={[GFM, remarkMath]} rehypePlugins={[rehypeKatex]} components={COMPONENTES_TABLA}>
        {protegerPrecios(normalizarLatex(texto))}
      </ReactMarkdown>
    );
  }

  return (
    <ReactMarkdown
      remarkPlugins={[GFM, remarkMath, remarkBreaks]}
      rehypePlugins={[rehypeSubrayado, rehypeKatex]}
      components={variante === 'inline' ? COMPONENTES_INLINE : COMPONENTES_BLOQUE}
    >
      {prepararTextoExamen(texto, variante)}
    </ReactMarkdown>
  );
}
