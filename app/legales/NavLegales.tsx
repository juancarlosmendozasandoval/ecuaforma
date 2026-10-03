'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { DOCUMENTOS_LEGALES } from '@/lib/legales/documentos';

export default function NavLegales() {
  const pathname = usePathname();

  return (
    <nav aria-label="Documentos legales" className="flex flex-wrap gap-2">
      {DOCUMENTOS_LEGALES.map((doc) => {
        const activo = pathname === doc.href;
        return (
          <Link
            key={doc.href}
            href={doc.href}
            aria-current={activo ? 'page' : undefined}
            className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors ${
              activo
                ? 'border-primary bg-primary text-white'
                : 'border-gray-200 bg-white text-gray-600 hover:border-primary/40 hover:text-primary'
            }`}
          >
            {doc.titulo}
          </Link>
        );
      })}
    </nav>
  );
}
