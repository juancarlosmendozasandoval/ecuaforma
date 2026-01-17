import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ShieldAlert, PlusCircle } from 'lucide-react';

// ⚠️ AQUÍ DEFINIMOS AL JEFE: Debe coincidir con el del SQL
const ADMIN_EMAIL = 'juanjuacmend@gmail.com';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = cookies();
  const supabase = createServerComponentClient({ cookies: () => cookieStore });

  const { data: { user } } = await supabase.auth.getUser();

  // Si no hay usuario, o el email no es el del jefe, lo mandamos al inicio
  if (!user || user.email !== ADMIN_EMAIL) {
    redirect('/');
  }

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
          <Link 
            href="/admin/crear-simulador" 
            className="flex items-center gap-3 px-4 py-3 bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors"
          >
            <PlusCircle size={20} /> Crear Simulador
          </Link>
        </nav>
      </aside>

      {/* Aquí se cargará la página que creemos en el Paso 3 */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}