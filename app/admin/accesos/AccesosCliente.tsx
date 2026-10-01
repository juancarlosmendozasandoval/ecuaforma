'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSupabase } from '@/app/components/AuthProvider';
import { inscribirAlumno, revocarAcceso } from './acciones';
import { AlertTriangle, CheckCircle, GraduationCap, Loader2, Search, Settings, Trash2, UserPlus, X } from 'lucide-react';

export type AlumnoAcceso = {
  id: string;
  email: string;
  nombre: string;
};

export type CursoOpcion = {
  id: string;
  nombre: string;
  institucion: string;
};

export type MatriculaAcceso = {
  id: string;
  usuarioId: string;
  cursoId: string;
  creadoEn: string;
};

export type SimuladorOpcion = {
  id: string;
  nombre: string;
  institucion: string;
};

function formatearFecha(iso: string) {
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return '';
  return fecha.toLocaleDateString('es-EC', {
    timeZone: 'America/Guayaquil',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function AccesosCliente({
  alumnos,
  cursos,
  matriculas,
  simuladores,
  errorLista,
}: {
  alumnos: AlumnoAcceso[];
  cursos: CursoOpcion[];
  matriculas: MatriculaAcceso[];
  simuladores: SimuladorOpcion[];
  errorLista: string;
}) {
  const router = useRouter();
  const { supabase } = useSupabase();
  const [busqueda, setBusqueda] = useState('');
  const [alumnoId, setAlumnoId] = useState('');
  const [cursoId, setCursoId] = useState('');
  const [inscribiendo, setInscribiendo] = useState(false);
  const [revocandoId, setRevocandoId] = useState('');
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  const [simuladorId, setSimuladorId] = useState('');
  const [emailSimulador, setEmailSimulador] = useState('');
  const [guardandoSimulador, setGuardandoSimulador] = useState(false);
  const [mensajeSimulador, setMensajeSimulador] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  const alumno = alumnos.find((item) => item.id === alumnoId) || null;
  const consulta = busqueda.trim().toLowerCase();

  const coincidencias = useMemo(() => {
    if (consulta.length < 2) return [];
    return alumnos
      .filter((item) => item.email.toLowerCase().includes(consulta) || item.nombre.toLowerCase().includes(consulta))
      .slice(0, 12);
  }, [alumnos, consulta]);

  const cursosPorId = useMemo(() => new Map(cursos.map((curso) => [curso.id, curso])), [cursos]);

  const activas = useMemo(() => {
    if (!alumno) return [];
    return matriculas
      .filter((matricula) => matricula.usuarioId === alumno.id)
      .map((matricula) => ({
        ...matricula,
        curso: cursosPorId.get(matricula.cursoId) || null,
      }));
  }, [alumno, matriculas, cursosPorId]);

  const disponibles = cursos.filter((curso) => !activas.some((matricula) => matricula.cursoId === curso.id));

  const elegirAlumno = (id: string) => {
    setAlumnoId(id);
    setCursoId('');
    setMensaje(null);
    const elegido = alumnos.find((item) => item.id === id);
    if (elegido?.email) setEmailSimulador(elegido.email);
  };

  const inscribir = async () => {
    if (!alumno || !cursoId || inscribiendo) return;
    setInscribiendo(true);
    setMensaje(null);
    const resultado = await inscribirAlumno(alumno.id, cursoId);
    setInscribiendo(false);
    if (!resultado.ok) {
      setMensaje({ tipo: 'error', texto: resultado.mensaje });
      return;
    }
    setCursoId('');
    setMensaje({ tipo: 'ok', texto: 'Alumno inscrito.' });
    router.refresh();
  };

  const revocar = async (accesoId: string) => {
    if (!alumno || revocandoId) return;
    if (!window.confirm('¿Quitar este curso al alumno?')) return;
    setRevocandoId(accesoId);
    setMensaje(null);
    const resultado = await revocarAcceso(accesoId, alumno.id);
    setRevocandoId('');
    if (!resultado.ok) {
      setMensaje({ tipo: 'error', texto: resultado.mensaje });
      return;
    }
    setMensaje({ tipo: 'ok', texto: 'Acceso revocado.' });
    router.refresh();
  };

  const otorgarSimulador = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!simuladorId || !emailSimulador.trim() || guardandoSimulador) return;
    setGuardandoSimulador(true);
    setMensajeSimulador(null);
    const { error } = await supabase.rpc('dar_acceso_simulador', {
      p_email: emailSimulador.trim().toLowerCase(),
      p_simulador_id: simuladorId,
    });
    setGuardandoSimulador(false);
    if (error) {
      setMensajeSimulador({ tipo: 'error', texto: 'No se pudo dar el acceso. Revisa que el correo tenga cuenta.' });
      return;
    }
    setMensajeSimulador({ tipo: 'ok', texto: `Acceso al simulador otorgado a ${emailSimulador.trim()}.` });
    setSimuladorId('');
  };

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <h1 className="flex items-center gap-3 text-3xl font-bold text-gray-800">
          <GraduationCap className="h-8 w-8 text-primary" />
          Matrículas
        </h1>
        <p className="mt-2 text-gray-500">Busca un alumno e inscríbelo o quítale un curso si la asignación fue un error.</p>
      </div>

      {errorLista && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          {errorLista}
        </div>
      )}

      <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-6">
        <label htmlFor="buscar-alumno" className="mb-2 block text-sm font-bold text-gray-700">
          Buscar estudiante
        </label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input
            id="buscar-alumno"
            type="search"
            value={busqueda}
            onChange={(event) => setBusqueda(event.target.value)}
            placeholder="Correo o nombre"
            className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-12 pr-4 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>

        {consulta.length >= 2 && (
          <ul className="mt-3 max-h-64 divide-y divide-gray-100 overflow-y-auto rounded-xl border border-gray-100">
            {coincidencias.length === 0 ? (
              <li className="px-4 py-3 text-sm text-gray-500">Ningún alumno coincide con esa búsqueda.</li>
            ) : (
              coincidencias.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => elegirAlumno(item.id)}
                    className={`flex w-full flex-col items-start gap-0.5 px-4 py-3 text-left transition-colors hover:bg-blue-50 sm:flex-row sm:items-center sm:justify-between ${
                      item.id === alumnoId ? 'bg-blue-50' : ''
                    }`}
                  >
                    <span className="font-semibold text-gray-800">{item.nombre || 'Sin nombre'}</span>
                    <span className="text-sm text-gray-500">{item.email || 'Sin correo'}</span>
                  </button>
                </li>
              ))
            )}
          </ul>
        )}
      </div>

      {alumno && (
        <section className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wide text-blue-600">Alumno seleccionado</p>
              <h2 className="truncate text-xl font-bold text-gray-900">{alumno.nombre || 'Sin nombre'}</h2>
              <p className="truncate text-sm text-gray-500">{alumno.email || 'Sin correo'}</p>
            </div>
            <button
              type="button"
              onClick={() => setAlumnoId('')}
              className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              aria-label="Quitar selección"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <h3 className="mb-3 mt-6 text-sm font-bold text-gray-700">Matrículas activas</h3>
          {activas.length === 0 ? (
            <p className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
              Este alumno no tiene cursos asignados.
            </p>
          ) : (
            <ul className="space-y-2">
              {activas.map((matricula) => (
                <li key={matricula.id} className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-gray-800">{matricula.curso?.nombre || 'Curso no disponible'}</p>
                    <p className="text-xs text-gray-500">
                      {matricula.curso?.institucion || ''}
                      {matricula.creadoEn ? ` · ${formatearFecha(matricula.creadoEn)}` : ''}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => revocar(matricula.id)}
                    disabled={revocandoId === matricula.id}
                    className="shrink-0 rounded-lg p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-60"
                    aria-label={`Quitar ${matricula.curso?.nombre || 'curso'}`}
                  >
                    {revocandoId === matricula.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <select
              value={cursoId}
              onChange={(event) => setCursoId(event.target.value)}
              className="min-w-0 flex-1 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              aria-label="Curso a inscribir"
            >
              <option value="">Elige un curso</option>
              {disponibles.map((curso) => (
                <option key={curso.id} value={curso.id}>
                  [{curso.institucion || 'General'}] {curso.nombre || 'Curso sin nombre'}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={inscribir}
              disabled={!cursoId || inscribiendo}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              {inscribiendo ? <Loader2 className="h-5 w-5 animate-spin" /> : <UserPlus className="h-5 w-5" />}
              {inscribiendo ? 'Inscribiendo...' : 'Inscribir Alumno'}
            </button>
          </div>

          {mensaje && (
            <div className={`mt-4 flex items-center gap-2 rounded-xl border p-3 text-sm font-medium ${
              mensaje.tipo === 'ok' ? 'border-green-200 bg-green-50 text-green-700' : 'border-red-200 bg-red-50 text-red-700'
            }`}>
              {mensaje.tipo === 'ok' ? <CheckCircle className="h-4 w-4 shrink-0" /> : <AlertTriangle className="h-4 w-4 shrink-0" />}
              {mensaje.texto}
            </div>
          )}
        </section>
      )}

      <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-6">
        <h2 className="flex items-center gap-2 text-lg font-bold text-gray-800">
          <Settings className="h-5 w-5 text-primary" /> Acceso a simuladores
        </h2>
        <p className="mt-1 text-sm text-gray-500">Sigue disponible el alta por correo para los bancos privados.</p>
        <form onSubmit={otorgarSimulador} className="mt-4 flex flex-col gap-3 sm:flex-row">
          <select
            value={simuladorId}
            onChange={(event) => setSimuladorId(event.target.value)}
            className="min-w-0 flex-1 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 outline-none focus:border-blue-500"
            aria-label="Simulador"
            required
          >
            <option value="">Elige un simulador</option>
            {simuladores.map((sim) => (
              <option key={sim.id} value={sim.id}>
                [{sim.institucion || 'General'}] {sim.nombre || 'Simulador'}
              </option>
            ))}
          </select>
          <input
            type="email"
            value={emailSimulador}
            onChange={(event) => setEmailSimulador(event.target.value)}
            placeholder="correo del alumno"
            required
            className="min-w-0 flex-1 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 outline-none focus:border-blue-500"
          />
          <button
            type="submit"
            disabled={guardandoSimulador}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white hover:bg-slate-800 disabled:bg-gray-300"
          >
            {guardandoSimulador ? <Loader2 className="h-5 w-5 animate-spin" /> : <UserPlus className="h-5 w-5" />}
            {guardandoSimulador ? 'Procesando...' : 'Dar acceso'}
          </button>
        </form>
        {mensajeSimulador && (
          <p className={`mt-3 text-sm font-medium ${mensajeSimulador.tipo === 'ok' ? 'text-green-700' : 'text-red-700'}`}>
            {mensajeSimulador.texto}
          </p>
        )}
      </section>
    </div>
  );
}
