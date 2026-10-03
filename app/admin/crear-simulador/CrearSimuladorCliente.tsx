'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Save, Loader2 } from 'lucide-react';
import {
  CONFIG_ESTATICA,
  validarConfigDinamica,
  type ConfigDinamica as Config,
  type TemaSelector,
} from '@/lib/simuladores/configDinamica';
import ConfigDinamica from '../simuladores/ConfigDinamica';
import { crearSimulador } from '../simuladores/acciones';

export default function CrearSimuladorCliente({ temas }: { temas: TemaSelector[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    nombre: '',
    institucion: '', // Campo libre
    categoria: '',
    materia: '',
    publico: true,
  });
  const [config, setConfig] = useState<Config>(CONFIG_ESTATICA);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const value = e.target.type === 'checkbox'
      ? (e.target as HTMLInputElement).checked
      : e.target.value;

    setFormData({ ...formData, [e.target.name]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validacion = validarConfigDinamica(config);
    if (!validacion.ok) {
      alert(validacion.mensaje);
      return;
    }

    setLoading(true);
    let resultado: Awaited<ReturnType<typeof crearSimulador>>;
    try {
      resultado = await crearSimulador({ ...formData, ...validacion.datos });
    } catch {
      resultado = { ok: false, mensaje: 'No se pudo crear el simulador.' };
    }

    if (!resultado.ok) {
      alert('Error: ' + resultado.mensaje);
      setLoading(false); // Solo quitamos loading si hubo error
      return;
    }

    // Un simulador dinámico no tiene preguntas que vincular a mano.
    if (resultado.es_dinamico) {
      alert('¡Mega-Simulador creado! Tomará preguntas al azar de los temas elegidos.');
      router.push('/admin/simuladores');
    } else {
      alert('¡Simulador creado correctamente! Redirigiendo a preguntas...');
      router.push(`/admin/preguntas/${resultado.slug}`);
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

        {/* Mega-Simulador */}
        <ConfigDinamica temas={temas} valor={config} onChange={setConfig} disabled={loading} />

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
          ) : config.es_dinamico ? (
            <><Save /> Crear Mega-Simulador</>
          ) : (
            <><Save /> Guardar y Agregar Preguntas</>
          )}
        </button>
      </form>
    </div>
  );
}
