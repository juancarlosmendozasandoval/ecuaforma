import Link from 'next/link';

// Este componente contiene el SVG de tu logo y el nombre de la marca.
// Está diseñado para ser reutilizable.
export default function Logo() {
  return (
    <Link href="/" className="flex items-center space-x-3 rtl:space-x-reverse group">
      <svg className="w-10 h-10 group-hover:scale-110 transition-transform duration-300" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
          {/* Fondo de la insignia */}
          <path d="M50 10 L 90 35 L 90 75 L 50 95 L 10 75 L 10 35 Z" fill="#2d3748"/>
          {/* Galón Amarillo (Superior) */}
          <path d="M30 40 L 50 28 L 70 40" stroke="#FFD700" strokeWidth="10" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
          {/* Galón Azul (Medio) */}
          <path d="M30 58 L 50 46 L 70 58" stroke="#3b82f6" strokeWidth="10" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
          {/* Galón Rojo (Inferior) */}
          <path d="M30 76 L 50 64 L 70 76" stroke="#ef4444" strokeWidth="10" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      <span className="self-center text-2xl font-extrabold whitespace-nowrap text-gray-800 font-exo-2">Ecuaforma</span>
    </Link>
  );
}