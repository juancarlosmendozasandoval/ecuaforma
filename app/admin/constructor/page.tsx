'use client';

import { useState, useEffect } from 'react';
import { useSupabase } from '../../components/AuthProvider';
import { 
  Save, Search, PlusCircle, Trash2, Library, CheckSquare, 
  ArrowRight, AlertCircle, CheckCircle, GripVertical 
} from 'lucide-react';
import Link from 'next/link';

export default function ConstructorMixtoPage() {
  const { supabase } = useSupabase();
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 1. Estados para el NUEVO Simulador
  const [nombre, setNombre] = useState('');
  const [institucion, setInstitucion] = useState('FAE');
  const [categoria, setCategoria] = useState('');
  const [materia, setMateria] = useState('');
  const [publico, setPublico] = useState(false);

  // 2. Estados para el Banco de Preguntas
  const [simuladoresDb, setSimuladoresDb] = useState<any[]>([]);
  const [simuladorSeleccionado, setSimuladorSeleccionado] = useState('');
  const [preguntasDisponibles, setPreguntasDisponibles] = useState<any[]>([]);
  const [busquedaPregunta, setBusquedaPregunta] = useState('');

  // 3. Estado para el "Carrito" (Preguntas Seleccionadas)
  const [carrito, setCarrito] = useState<any[]>([]);

  const showAlert = (type: 'success' | 'error', text: string) => {
    setAlert({ type, text });
    setTimeout(() => setAlert(null), 5000);
  };

  // Cargar lista de simuladores al iniciar para el filtro
  useEffect(() => {
    const cargarSimuladores = async () => {
      const { data } = await supabase
        .from('simuladores')
        .select('id, nombre, institucion')
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });
      if (data) setSimuladoresDb(data);
    };
    cargarSimuladores();
  }, [supabase]);

  // Cargar preguntas cuando seleccionas un simulador en el filtro
  useEffect(() => {
    const cargarPreguntas = async () => {
      if (!simuladorSeleccionado) {
        setPreguntasDisponibles([]);
        return;
      }
      const { data } = await supabase
        .from('preguntas')
        .select('*')
        .eq('simulador_id', simuladorSeleccionado)
        .order('orden', { ascending: true });
      if (data) setPreguntasDisponibles(data);
    };
    cargarPreguntas();
  }, [simuladorSeleccionado, supabase]);

  // Funciones del Carrito
  const agregarAlCarrito = (pregunta: any) => {
    // Evitar duplicados exactos en el carrito usando el ID original temporalmente
    if (carrito.find(p => p.id === pregunta.id)) {
      showAlert('error', 'Esta pregunta ya está en tu nuevo simulador.');
      return;
    }
    setCarrito([...carrito, pregunta]);
  };

  const quitarDelCarrito = (preguntaId: string) => {
    setCarrito(carrito.filter(p => p.id !== preguntaId));
  };

  // GUARDAR EL NUEVO SIMULADOR ENSAMBLADO
  const ensamblarSimulador = async () => {
    if (!nombre || !categoria || !materia) return showAlert('error', 'Completa los datos básicos del simulador.');
    if (carrito.length === 0) return showAlert('error', 'Debes agregar al menos 1 pregunta al carrito.');

    setLoading(true);

    // 1. Crear URL limpia y única
    const slugBase = nombre.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9-_]/g, '-').replace(/-+/g, '-');
    const slugFinal = `${slugBase}-mixto-${Math.floor(Math.random() * 1000)}`;

    try {
      // 2. Insertar la fila del nuevo simulador
      const { data: nuevoSim, error: errSim } = await supabase
        .from('simuladores')
        .insert([{
          nombre,
          slug: slugFinal,
          institucion,
          categoria,
          materia,
          publico
        }])
        .select()
        .single();

      if (errSim) throw errSim;

      // 3. Limpiar las preguntas del carrito (quitarles su ID viejo) y asignarles el ID del nuevo simulador
      const preguntasNuevas = carrito.map((preg, index) => ({
        simulador_id: nuevoSim.id,
        pregunta: preg.pregunta,
        opciones: preg.opciones,
        respuesta: preg.respuesta,
        explicacion: preg.explicacion,
        imagen_url: preg.imagen_url,
        orden: index + 1 // El orden en el que quedaron en el carrito
      }));

      // 4. Insertar todas las preguntas clonadas de golpe
      const { error: errPreg } = await supabase.from('preguntas').insert(preguntasNuevas);
      if (errPreg) throw errPreg;

      showAlert('success', '¡Simulador Mixto creado exitosamente!');
      
      // Limpiar formulario
      setNombre(''); setCategoria(''); setMateria(''); setCarrito([]);
      
    } catch (error: any) {
      showAlert('error', 'Error al ensamblar: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Filtrado de la barra de búsqueda en las preguntas disponibles
  const preguntasFiltradas = preguntasDisponibles.filter(p => 
    p.pregunta.toLowerCase().includes(busquedaPregunta.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto py-6 space-y-6">
      
      {alert && (
        <div className={`fixed top-5 right-5 z-50 p-4 rounded-xl shadow-xl flex items-center gap-3 font-semibold text-white transition-all ${
          alert.type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'
        }`}>
          {alert.type === 'success' ? <CheckCircle className="w-5 h-5"/> : <AlertCircle className="w-5 h-5"/>}
          {alert.text}
        </div>
      )}

      {/* Encabezado */}
      <div className="flex items-center justify-between bg-slate-900 p-6 rounded-2xl text-white shadow-lg">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <Library className="text-indigo-400 w-8 h-8"/> Constructor de Simuladores
          </h1>
          <p className="text-slate-400 text-sm mt-1">Crea exámenes nuevos reciclando preguntas de tu base de datos.</p>
        </div>
        <Link href="/admin/simuladores" className="text-sm font-medium text-slate-300 hover:text-white transition">
          ← Volver al Gestor
        </Link>
      </div>

      {/* SECCIÓN 1: Datos del Nuevo Simulador */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <h2 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">1. Datos Generales del Nuevo Examen</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nombre del Simulador</label>
            <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Repaso General Lógica" className="w-full p-2.5 border border-gray-300 rounded-lg bg-gray-50 focus:ring-2 focus:ring-primary focus:bg-white transition" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Institución</label>
            <select value={institucion} onChange={(e) => setInstitucion(e.target.value)} className="w-full p-2.5 border border-gray-300 rounded-lg bg-gray-50 focus:ring-2 focus:ring-primary focus:bg-white font-semibold">
              <option value="FAE">FAE</option><option value="Armada">Armada</option>
              <option value="Ejército">Ejército</option><option value="Policía">Policía</option>
              <option value="MIES">MIES</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Categoría</label>
            <input type="text" value={categoria} onChange={(e) => setCategoria(e.target.value)} placeholder="Ej: Psicológicas" className="w-full p-2.5 border border-gray-300 rounded-lg bg-gray-50 focus:ring-2 focus:ring-primary focus:bg-white" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Materia</label>
            <input type="text" value={materia} onChange={(e) => setMateria(e.target.value)} placeholder="Ej: Razonamiento Abstracto" className="w-full p-2.5 border border-gray-300 rounded-lg bg-gray-50 focus:ring-2 focus:ring-primary focus:bg-white" />
          </div>
          <div className="flex items-end pb-1 md:col-span-2">
            <label className="flex items-center gap-2 cursor-pointer bg-gray-50 p-2.5 rounded-lg border border-gray-200 w-full hover:bg-gray-100 transition">
              <input type="checkbox" checked={publico} onChange={(e) => setPublico(e.target.checked)} className="w-5 h-5 rounded text-primary focus:ring-primary" />
              <span className="text-sm font-bold text-gray-700">Hacer Público inmediatamente</span>
            </label>
          </div>
        </div>
      </div>

      {/* SECCIÓN 2: El Banco y el Carrito (2 Columnas) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        
        {/* COLUMNA IZQUIERDA: Banco de Preguntas */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-[600px]">
          <div className="p-4 bg-gray-50 border-b border-gray-200">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2 mb-3">
              <Search className="w-5 h-5 text-blue-500"/> Banco de Preguntas
            </h2>
            <div className="space-y-3">
              <select 
                value={simuladorSeleccionado} 
                onChange={(e) => setSimuladorSeleccionado(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg text-sm bg-white font-medium"
              >
                <option value="">-- Selecciona un simulador fuente --</option>
                {simuladoresDb.map(sim => (
                  <option key={sim.id} value={sim.id}>[{sim.institucion}] {sim.nombre}</option>
                ))}
              </select>
              
              {simuladorSeleccionado && (
                <input 
                  type="text" 
                  placeholder="Buscar palabra en la pregunta..." 
                  value={busquedaPregunta}
                  onChange={(e) => setBusquedaPregunta(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg text-sm bg-white"
                />
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 bg-slate-50/50">
            {!simuladorSeleccionado ? (
              <p className="text-center text-gray-400 text-sm mt-10">Selecciona un simulador arriba para ver sus preguntas.</p>
            ) : preguntasFiltradas.length === 0 ? (
              <p className="text-center text-gray-400 text-sm mt-10">No se encontraron preguntas.</p>
            ) : (
              <div className="space-y-3">
                {preguntasFiltradas.map((preg) => {
                  const yaAgregada = carrito.some(p => p.id === preg.id);
                  return (
                    <div key={preg.id} className={`p-3 rounded-xl border transition-all ${yaAgregada ? 'bg-gray-100 border-gray-200 opacity-60' : 'bg-white border-blue-100 shadow-sm hover:border-blue-300'}`}>
                      <div className="flex justify-between items-start gap-3">
                        <p className="text-sm text-gray-700 font-medium line-clamp-3">{preg.pregunta}</p>
                        <button
                          onClick={() => agregarAlCarrito(preg)}
                          disabled={yaAgregada}
                          className={`shrink-0 p-1.5 rounded-lg transition-colors ${yaAgregada ? 'text-gray-400 cursor-not-allowed' : 'text-blue-600 bg-blue-50 hover:bg-blue-600 hover:text-white'}`}
                          title="Agregar al nuevo simulador"
                        >
                          {yaAgregada ? <CheckSquare className="w-5 h-5"/> : <PlusCircle className="w-5 h-5"/>}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* COLUMNA DERECHA: Tu Selección (Carrito) */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-[600px]">
          <div className="p-4 bg-emerald-50 border-b border-emerald-100 flex justify-between items-center">
            <h2 className="text-lg font-bold text-emerald-800 flex items-center gap-2">
              <CheckSquare className="w-5 h-5"/> Tu Nuevo Examen
            </h2>
            <span className="bg-emerald-200 text-emerald-800 px-3 py-1 rounded-full text-xs font-bold">
              {carrito.length} Preguntas
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {carrito.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3">
                <ArrowRight className="w-12 h-12 text-gray-200"/>
                <p className="text-sm">Agrega preguntas desde el panel izquierdo.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {carrito.map((preg, idx) => (
                  <div key={preg.id} className="p-3 bg-white rounded-xl border border-gray-200 shadow-sm flex items-center gap-3 group">
                    <div className="text-gray-300 group-hover:text-gray-500 cursor-move">
                      <GripVertical className="w-5 h-5"/>
                    </div>
                    <div className="flex-1">
                      <span className="text-xs font-bold text-emerald-600 mb-1 block">Pregunta {idx + 1}</span>
                      <p className="text-sm text-gray-700 font-medium line-clamp-2">{preg.pregunta}</p>
                    </div>
                    <button
                      onClick={() => quitarDelCarrito(preg.id)}
                      className="shrink-0 p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Quitar pregunta"
                    >
                      <Trash2 className="w-4 h-4"/>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* BOTÓN DE GUARDAR FIJO ABAJO */}
          <div className="p-4 bg-gray-50 border-t border-gray-200">
            <button
              onClick={ensamblarSimulador}
              disabled={loading || carrito.length === 0}
              className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg transition-all ${
                loading || carrito.length === 0 ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-primary hover:bg-blue-700 text-white transform hover:-translate-y-0.5'
              }`}
            >
              {loading ? 'Ensamblando...' : <><Save className="w-5 h-5"/> Ensamblar y Guardar Simulador</>}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}