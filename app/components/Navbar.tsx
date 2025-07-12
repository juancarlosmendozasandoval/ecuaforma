
'use client';
import Link from 'next/link';
import { useState } from 'react';
import { Menu, X, BookOpen, Shield, Home, Phone } from 'lucide-react';

const navLinks = [
  { href: '/', label: 'Inicio', icon: Home },
  { href: '/cursos', label: 'Cursos', icon: BookOpen },
  { href: '/simuladores', label: 'Simuladores', icon: Shield },
  { href: '/contacto', label: 'Contacto', icon: Phone },
];

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="bg-white shadow-md sticky top-0 z-50">
      <div className="main-container flex items-center justify-between h-20">
        <Link href="/" className="text-2xl font-bold text-primary">
          Ecuaforma
        </Link>
        <nav className="hidden md:flex items-center space-x-8">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} className="text-base font-medium text-text-primary hover:text-primary transition-colors duration-300">
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="md:hidden">
          <button onClick={() => setIsOpen(!isOpen)} className="text-primary">
            {isOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>
      </div>
      {isOpen && (
        <div className="md:hidden bg-white pb-4">
          <nav className="flex flex-col items-center space-y-4">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href} onClick={() => setIsOpen(false)} className="flex items-center gap-2 text-lg font-medium text-text-primary hover:text-primary transition-colors duration-300">
                <link.icon size={20} />
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
