'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Save, Loader2 } from 'lucide-react';
import {
  CONFIG_ESTATICA,
  validarConfigDinamica,
  type ConfigDinamica as Config,
  type MateriaSelector,
  type TemaSelector,
} from '@/lib/simuladores/configDinamica';
import ConfigDinamica from '../simuladores/ConfigDinamica';
import { crearSimulador } from '../simuladores/acciones';

type Props = {
  temas: TemaSelector[];
  materias: MateriaSelector[];
  instituciones: string[];
};

const claseCampo = 'w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white';

export default function CrearSimuladorCliente({ temas, materias, instituciones }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    nombre: '',
    institucion: '',
    materia_id: '',
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
          <label htmlFor="nombre" className="block text-sm font-bold text-gray-700 mb-2">Nombre del Examen</label>
          <input
            id="nombre"
            type="text"
            name="nombre"
            required
            placeholder="Ej: Matemáticas Fase 1 - 2026"
            value={formData.nombre}
            onChange={handleChange}
            className={claseCampo}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="institucion" className="block text-sm font-bold text-gray-700 mb-2">Institución</label>
            <select id="institucion" name="institucion" required value={formData.institucion} onChange={handleChange} className={claseCampo}>
              <option value="" disabled>Selecciona la institución</option>
              {instituciones.map((inst) => (
                <option key={inst} value={inst}>{inst}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="materia_id" className="block text-sm font-bold text-gray-700 mb-2">Materia</label>
            <select id="materia_id" name="materia_id" required value={formData.materia_id} onChange={handleChange} className={claseCampo}>
              <option value="" disabled>Selecciona la materia</option>
              {materias.map((materia) => (
                <option key={materia.id} value={materia.id}>{materia.nombre}</option>
              ))}
            </select>
            {materias.length === 0 && (
              <p className="text-xs text-rose-600 mt-1">
                No hay materias. Créalas en <Link href="/admin/categorias" className="underline font-bold">Categorías</Link>.
              </p>
            )}
          </div>
        </div>

        {/* Mega-Simulador */}
        <ConfigDinamica
          temas={temas}
          valor={config}
          onChange={setConfig}
          materiaId={formData.materia_id || null}
          disabled={loading}
        />

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
