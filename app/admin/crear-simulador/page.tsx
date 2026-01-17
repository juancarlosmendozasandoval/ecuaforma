'use client';

import { useState } from 'react';
import { useSupabase } from '../../components/AuthProvider'; 
import { useRouter } from 'next/navigation';
import { Save, Loader2 } from 'lucide-react';

export default function CrearSimuladorPage() {
  const { supabase } = useSupabase();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Datos del formulario
  const [formData, setFormData] = useState({
    nombre: '',
    institucion: '', // Campo libre
    categoria: '',
    materia: '',
    publico: true,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const value = e.target.type === 'checkbox' 
      ? (e.target as HTMLInputElement).checked 
      : e.target.value;
    
    setFormData({ ...formData, [e.target.name]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Generar slug automático
    const slug = formData.nombre
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');

    try {
      const { data, error } = await supabase
        .from('simuladores')
        .insert([
          {
            nombre: formData.nombre,
            slug: slug,
            institucion: formData.institucion.trim(),
            categoria: formData.categoria,
            materia: formData.materia,
            publico: formData.publico
          }
        ])
        .select()
        .single();

      if (error) throw error;

      alert('¡Simulador creado correctamente! Redirigiendo a preguntas...');
      
      // ✅ REDIRECCIÓN: Te lleva directo a agregar preguntas
      router.push(`/admin/preguntas/${data.slug}`);
      
    } catch (error: any) {
      console.error(error);
      alert('Error: ' + error.message);
      setLoading(false); // Solo quitamos loading si hubo error
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white p-6 md:p-8 rounded-xl shadow-lg border border-gray-100">
      <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-6 border-b pb-4">
        Crear Nuevo Simulador
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Nombre */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Nombre del Examen</label>
          <input
            type="text"
            name="nombre"
            required
            placeholder="Ej: Matemáticas Fase 1 - 2026"
            value={formData.nombre}
            onChange={handleChange}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Institución - TEXTO LIBRE */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Institución</label>
            <input
              type="text"
              name="institucion"
              required
              placeholder="Ej: Policía Nacional, Bomberos..."
              value={formData.institucion}
              onChange={handleChange}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          {/* Categoría */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Categoría</label>
            <input
              type="text"
              name="categoria"
              required
              placeholder="Ej: Tropa, Oficiales"
              value={formData.categoria}
              onChange={handleChange}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>

        {/* Materia */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Materia</label>
          <input
            type="text"
            name="materia"
            required
            placeholder="Ej: Razonamiento Lógico"
            value={formData.materia}
            onChange={handleChange}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        {/* Checkbox Público */}
        <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg border border-blue-100">
          <input
            type="checkbox"
            name="publico"
            id="publico"
            checked={formData.publico}
            onChange={handleChange}
            className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
          />
          <label htmlFor="publico" className="text-gray-700 font-medium cursor-pointer select-none">
            Hacer público inmediatamente (visible en la web)
          </label>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-slate-900 text-white font-bold py-4 rounded-lg hover:bg-slate-800 transition-all flex items-center justify-center gap-2 text-lg shadow-lg disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {loading ? (
            <><Loader2 className="animate-spin" /> Creando...</>
          ) : (
            <><Save /> Guardar y Agregar Preguntas</>
          )}
        </button>
      </form>
    </div>
  );
}