'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function BotonInscripcionGratis({ cursoId, usuarioId }: { cursoId: string, usuarioId: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const inscribirse = async () => {
    setLoading(true);
    
    try {
      // Llamamos a nuestra API segura
      const res = await fetch('/api/inscribir-gratis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cursoId, usuarioId }),
      });

      if (!res.ok) {
        throw new Error('Error en la inscripción');
      }

      // Si todo sale bien, refrescamos la página para desaparecer los candados
      router.refresh();
    } catch (error) {
      console.error(error);
      alert('Hubo un problema al inscribirte. Inténtalo de nuevo.');
      setLoading(false); // Solo quitamos el loading si hay error, si hay éxito la página se recargará sola
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