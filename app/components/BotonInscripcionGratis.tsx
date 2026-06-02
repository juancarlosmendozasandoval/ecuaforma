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
      const res = await fetch('/api/inscribir-gratis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cursoId, usuarioId }),
      });

      const data = await res.json();

      if (!res.ok) {
        // Ahora capturamos el mensaje REAL que manda la API (ej. "Datos incompletos", "Curso no encontrado", etc)
        throw new Error(data.error || 'Error desconocido en el servidor');
      }

      // Si fue exitoso (o si ya estaba inscrito), refrescamos la página
      router.refresh();
      
    } catch (error: any) {
      console.error(error);
      // Mostramos la alerta con el error exacto para saber qué corregir
      alert(`Fallo en la inscripción: ${error.message}`);
      setLoading(false); 
    }
  };

  return (
    <button 
      onClick={inscribirse}
      disabled={loading}
      className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold shadow-md hover:bg-blue-700 transition-colors flex justify-center items-center gap-2 disabled:opacity-70"
    >
      {loading ? <><Loader2 className="w-5 h-5 animate-spin" /> Procesando...</> : 'Inscribirme Ahora (Gratis)'}
    </button>
  );
}