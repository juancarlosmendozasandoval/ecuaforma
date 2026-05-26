'use client';

import { useState, useEffect } from 'react';
import { useSupabase } from '@/app/components/AuthProvider';
import { ShieldCheck, UserPlus, Loader2, CheckCircle, AlertTriangle, GraduationCap, Settings } from 'lucide-react';
import Link from 'next/link';

export default function AccesosPage() {
  const { supabase } = useSupabase();
  
  // Estados de datos
  const [simuladores, setSimuladores] = useState<any[]>([]);
  const [cursos, setCursos] = useState<any[]>([]);
  
  // Estados del formulario
  const [tipoAcceso, setTipoAcceso] = useState<'curso' | 'simulador'>('curso');
  const [selectedItem, setSelectedItem] = useState('');
  const [email, setEmail] = useState('');
  
  // Estados de UI
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Cargar listas al abrir la página
  useEffect(() => {
    const fetchData = async () => {
      // Cargar Simuladores
      const { data: simsData } = await supabase
        .from('simuladores')
        .select('id, nombre, institucion')
        .order('institucion');
      if (simsData) setSimuladores(simsData);

      // Cargar Cursos
      const { data: cursosData } = await supabase
        .from('cursos')
        .select('id, nombre, institucion')
        .eq('is_deleted', false)
        .order('institucion');
      if (cursosData) setCursos(cursosData);
    };
    fetchData();
  }, [supabase]);

  // Limpiar selección cuando cambias de pestaña
  useEffect(() => {
    setSelectedItem('');
    setMessage(null);
  }, [tipoAcceso]);

  const handleDarAcceso = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    if (!selectedItem || !email) {
      setMessage({ type: 'error', text: 'Por favor completa ambos campos.' });
      setLoading(false);
      return;
    }

    try {
      if (tipoAcceso === 'simulador') {
        const { error } = await supabase.rpc('dar_acceso_simulador', {
          p_email: email.trim().toLowerCase(),
          p_simulador_id: selectedItem
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.rpc('dar_acceso_curso', {
          p_email: email.trim().toLowerCase(),
          p_curso_id: selectedItem
        });
        if (error) throw error;
      }

      setMessage({ type: 'success', text: `¡Acceso otorgado correctamente a ${email}!` });
      setEmail(''); 
      
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Error al otorgar acceso. Verifica que el correo esté bien escrito.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-10 px-4">
      <div className="mb-8">
        <Link href="/admin" className="text-gray-500 hover:text-blue-600 font-medium text-sm mb-4 inline-block">
          ← Volver al Panel
        </Link>
        <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
          <ShieldCheck className="text-primary w-8 h-8" />
          Gestión de Accesos
        </h1>
        <p className="text-gray-500 mt-2">Otorga acceso a cursos y simuladores privados a tus estudiantes usando solo su correo.</p>
      </div>

      <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100">
        
        {/* Selector de Tipo de Acceso (Tabs) */}
        <div className="flex p-1 mb-8 bg-gray-100 rounded-xl">
          <button
            type="button"
            onClick={() => setTipoAcceso('curso')}
            className={`flex-1 py-3 px-4 flex items-center justify-center gap-2 font-bold text-sm rounded-lg transition-all ${
              tipoAcceso === 'curso' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <GraduationCap className="w-5 h-5" /> Acceso a Cursos
          </button>
          <button
            type="button"
            onClick={() => setTipoAcceso('simulador')}
            className={`flex-1 py-3 px-4 flex items-center justify-center gap-2 font-bold text-sm rounded-lg transition-all ${
              tipoAcceso === 'simulador' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Settings className="w-5 h-5" /> Acceso a Simulador
          </button>
        </div>

        <form onSubmit={handleDarAcceso} className="space-y-6">
          
          {/* Selector Dinámico */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              1. Selecciona el {tipoAcceso === 'curso' ? 'Curso' : 'Simulador'}
            </label>
            <select
              value={selectedItem}
              onChange={(e) => setSelectedItem(e.target.value)}
              className="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary bg-gray-50 text-gray-800 outline-none"
              required
            >
              <option value="" disabled>-- Elige un {tipoAcceso} de la lista --</option>
              {tipoAcceso === 'curso' 
                ? cursos.map((c) => <option key={c.id} value={c.id}>[{c.institucion}] - {c.nombre}</option>)
                : simuladores.map((sim) => <option key={sim.id} value={sim.id}>[{sim.institucion}] - {sim.nombre}</option>)
              }
            </select>
          </div>

          {/* Input de Correo */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">2. Correo del Alumno</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ejemplo@correo.com"
              className="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary bg-gray-50 outline-none"
              required
            />
            <p className="text-xs text-gray-500 mt-2 italic">
              * El alumno ya debe haber creado una cuenta en la plataforma con este correo.
            </p>
          </div>

          {/* Mensajes de Alerta */}
          {message && (
            <div className={`p-4 rounded-xl flex items-center gap-3 font-medium animate-fade-in ${
              message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {message.type === 'success' ? <CheckCircle className="w-5 h-5 flex-shrink-0"/> : <AlertTriangle className="w-5 h-5 flex-shrink-0"/>}
              {message.text}
            </div>
          )}

          {/* Botón Guardar */}
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-4 px-6 rounded-xl font-bold text-white shadow-lg flex justify-center items-center gap-2 transition-all ${
              loading ? 'bg-gray-400 cursor-wait' : 'bg-primary hover:bg-blue-700 hover:shadow-xl transform hover:-translate-y-1'
            }`}
          >
            {loading ? (
              <><Loader2 className="w-6 h-6 animate-spin" /> Procesando...</>
            ) : (
              <><UserPlus className="w-6 h-6" /> Otorgar Acceso al Alumno</>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}