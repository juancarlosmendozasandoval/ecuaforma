import Link from 'next/link';
import { requireAdmin } from '@/lib/auth/requireAdmin';
// 🌟 Se agregó 'GraduationCap' a las importaciones de iconos
import { ShieldAlert, Key, BarChart, Settings, Library, GraduationCap, Database } from 'lucide-react';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Si no hay usuario, o el email no es el del jefe, requireAdmin lo manda al inicio
  const { user } = await requireAdmin();

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-50">
      {/* Barra lateral de Admin */}
      <aside className="w-full md:w-64 bg-slate-900 text-white flex-shrink-0">
        <div className="p-6 border-b border-slate-800">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <ShieldAlert className="text-red-500" /> Admin Panel
          </h2>
          <p className="text-xs text-gray-400 mt-1">Hola, {user.email}</p>
        </div>
        <nav className="p-4 space-y-2">
          
          {/* 🌟 NUEVO BOTÓN: Gestor de Cursos (LMS) */}
          <Link 
            href="/admin/cursos" 
            className="flex items-center gap-3 px-4 py-3 bg-indigo-900/50 text-indigo-100 rounded-lg hover:bg-indigo-800 transition-colors border border-indigo-700/50 font-semibold"
          >
            <GraduationCap size={20} /> Gestor de Cursos
          </Link>

          <Link 
            href="/admin/banco-lecciones" 
            className="flex items-center gap-3 px-4 py-3 bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors"
          >
            <Database size={20} /> Banco de Lecciones
          </Link>

          {/* Botón para ir al Panel CRUD de Simuladores */}
          <Link 
            href="/admin/simuladores" 
            className="flex items-center gap-3 px-4 py-3 bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors"
          >
            <Settings size={20} /> Gestionar Simuladores
          </Link>

          {/* BOTÓN: Constructor Mixto */}
          <Link 
            href="/admin/constructor" 
            className="flex items-center gap-3 px-4 py-3 bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors"
          >
            <Library size={20} /> Ensamblar Mixto
          </Link>

          <Link 
            href="/admin/accesos" 
            className="flex items-center gap-3 px-4 py-3 bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors"
          >
            <Key size={20} /> Dar Accesos
          </Link>

          <Link 
            href="/admin/resultados" 
            className="flex items-center gap-3 px-4 py-3 bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors"
          >
            <BarChart size={20} /> Ver Resultados
          </Link>
        </nav>
      </aside>

      {/* Aquí se cargará la página */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}