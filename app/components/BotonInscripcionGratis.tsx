'use client';

import { useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function BotonInscripcionGratis({ cursoId, usuarioId }: { cursoId: string, usuarioId: string }) {
  const [loading, setLoading] = useState(false);
  const supabase = createClientComponentClient();
  const router = useRouter();

  const inscribirse = async () => {
    setLoading(true);
    
    // Insertamos el acceso en la base de datos
    const { error } = await supabase
      .from('accesos_cursos')
      .insert([{ curso_id: cursoId, usuario_id: usuarioId }]);

    if (error) {
      console.error(error);
      alert('Hubo un problema al inscribirte. Inténtalo de nuevo.');
      setLoading(false);
    } else {
      // Si fue exitoso, refrescamos la página. El servidor detectará que ya tiene acceso y quitará los candados.
      router.refresh();
    }
  };

  return (
    <button 
      onClick={inscribirse}
      disabled={loading}
      className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold shadow-md hover:bg-blue-700 transition-colors flex justify-center items-center gap-2 disabled:opacity-70"
    >
      {loading ? <><Loader2 className="w-5 h-5 animate-spin" /> Inscribiendo...</> : 'Inscribirme Ahora (Gratis)'}
    </button>
  );
}