'use client';
import Link from 'next/link';
import { useState } from 'react';
import { Menu, X, BookOpen, Shield, Home, Phone, LogOut, Lock, History } from 'lucide-react'; // Agregado History
import { useSupabase } from './AuthProvider';
import Image from 'next/image';
import Logo from './Logo';

const navLinks = [
  { href: '/cursos', label: 'Cursos', icon: BookOpen },
  { href: '/simuladores', label: 'Simuladores', icon: Shield },
  { href: '/contacto', label: 'Contacto', icon: Phone },
];

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const { supabase, user, signOut } = useSupabase();

  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${location.origin}/auth/callback`,
      },
    });
  };

  return (
    <header className="bg-white shadow-md sticky top-0 z-50">
      <div className="main-container flex items-center justify-between h-20">
        <Logo />
        <nav className="hidden md:flex items-center space-x-6">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} className="text-base font-medium text-text-primary hover:text-primary transition-colors duration-300">
              {link.label}
            </Link>
          ))}
          {user && (
            <Link href="/mis-cursos" className="text-base font-medium text-text-primary hover:text-primary transition-colors duration-300 flex items-center gap-1">
              <Lock size={14} /> Mis Cursos
            </Link>
          )}
          <div className="w-px h-6 bg-gray-200" />
          {user ? (
            <div className="relative group">
              <button className="flex items-center gap-2">
                <Image
                  src={user.user_metadata.avatar_url}
                  alt={user.user_metadata.full_name || 'Avatar'}
                  width={32}
                  height={32}
                  className="rounded-full"
                />
                <span className="font-medium text-sm">{user.user_metadata.full_name}</span>
              </button>
              {/* Dropdown del usuario */}
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
                {/* OPCIÓN AGREGADA: MI HISTORIAL */}
                <Link
                  href="/mi-historial"
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                >
                  <History size={16} /> Mi Historial
                </Link>
                
                <button
                  onClick={signOut}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                >
                  <LogOut size={16} /> Cerrar Sesión
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={handleLogin}
              className="bg-primary text-white font-bold py-2 px-4 rounded-lg hover:bg-secondary transition-colors"
            >
              Iniciar Sesión
            </button>
          )}
        </nav>
        <div className="md:hidden">
          <button onClick={() => setIsOpen(!isOpen)} className="text-primary">
            {isOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>
      </div>
      
      {/* Menú Móvil */}
      {isOpen && (
        <div className="md:hidden bg-white pb-4 border-t">
          <nav className="flex flex-col items-center space-y-4 pt-4">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href} onClick={() => setIsOpen(false)} className="flex items-center gap-2 text-lg font-medium text-text-primary hover:text-primary transition-colors duration-300">
                <link.icon size={20} />
                {link.label}
              </Link>
            ))}
             {user && (
              <>
                <Link href="/mis-cursos" onClick={() => setIsOpen(false)} className="flex items-center gap-2 text-lg font-medium text-text-primary hover:text-primary transition-colors duration-300">
                  <Lock size={20} /> Mis Cursos
                </Link>
                {/* OPCIÓN AGREGADA EN MÓVIL TAMBIÉN */}
                <Link href="/mi-historial" onClick={() => setIsOpen(false)} className="flex items-center gap-2 text-lg font-medium text-text-primary hover:text-primary transition-colors duration-300">
                  <History size={20} /> Mi Historial
                </Link>
              </>
            )}
            <div className="w-full px-8">
              <div className="w-full h-px bg-gray-200 my-2" />
              {user ? (
                 <button
                  onClick={() => { signOut(); setIsOpen(false); }}
                  className="w-full flex items-center justify-center gap-2 text-lg font-medium text-red-500"
                >
                  <LogOut size={20} /> Cerrar Sesión
                </button>
              ) : (
                <button
                  onClick={() => { handleLogin(); setIsOpen(false); }}
                  className="w-full bg-primary text-white font-bold py-3 rounded-lg"
                >
                  Iniciar Sesión con Google
                </button>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}