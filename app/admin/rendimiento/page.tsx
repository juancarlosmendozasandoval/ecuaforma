import { requireAdmin } from '@/lib/auth/requireAdmin';
import { createAdminClient } from '@/lib/supabase/admin';
import RendimientoCliente, { type IntentoRendimiento } from './RendimientoCliente';

export const dynamic = 'force-dynamic';

const LIMITE = 100;

type SimuladorResumen = { nombre: string | null };

type FilaHistorial = {
  id: string;
  user_id: string;
  puntaje: number;
  created_at: string;
  simuladores: SimuladorResumen | SimuladorResumen[] | null;
};

function leerSimulador(valor: FilaHistorial['simuladores']) {
  const fila = Array.isArray(valor) ? valor[0] : valor;
  if (!fila || typeof fila !== 'object') return null;
  return fila.nombre || '';
}

function leerIdentidad(usuario: { email?: string | null; user_metadata?: Record<string, unknown> | null }) {
  const meta = usuario.user_metadata || {};
  const nombre =
    (typeof meta.full_name === 'string' && meta.full_name.trim()) ||
    (typeof meta.name === 'string' && meta.name.trim()) ||
    '';
  return { email: usuario.email || '', nombre };
}

/** Empareja los user_id del historial con el correo y el nombre de Auth. */
async function identidadesPorUsuario(ids: string[]) {
  const mapa = new Map<string, { email: string; nombre: string }>();
  const pendientes = new Set(ids.filter(Boolean));
  if (pendientes.size === 0) return mapa;

  const admin = createAdminClient();
  const porPagina = 200;

  for (let pagina = 1; pagina <= 20 && pendientes.size > 0; pagina++) {
    const { data, error } = await admin.auth.admin.listUsers({ page: pagina, perPage: porPagina });
    if (error) throw error;
    const usuarios = data?.users || [];
    for (const usuario of usuarios) {
      if (!pendientes.has(usuario.id)) continue;
      mapa.set(usuario.id, leerIdentidad(usuario));
      pendientes.delete(usuario.id);
    }
    if (usuarios.length < porPagina) break;
  }

  await Promise.all(
    Array.from(pendientes).map(async (id) => {
      const { data, error } = await admin.auth.admin.getUserById(id);
      if (error || !data?.user) return;
      mapa.set(id, leerIdentidad(data.user));
    })
  );

  return mapa;
}

export default async function RendimientoPage() {
  const { supabase } = await requireAdmin();

  const { data, error } = await supabase
    .from('historial_simuladores')
    .select('id, user_id, puntaje, created_at, simuladores(nombre)')
    .order('created_at', { ascending: false })
    .limit(LIMITE);

  if (error) {
    console.error('Error al cargar el radar de rendimiento:', error);
    return <RendimientoCliente intentos={[]} errorLista="No se pudieron cargar las calificaciones." />;
  }

  const filas = (data || []) as FilaHistorial[];
  let identidades = new Map<string, { email: string; nombre: string }>();
  try {
    identidades = await identidadesPorUsuario(filas.map((fila) => fila.user_id));
  } catch (fallo) {
    console.error('No se pudieron leer los estudiantes:', fallo);
  }

  const intentos: IntentoRendimiento[] = filas.map((fila) => {
    const identidad = identidades.get(fila.user_id);
    return {
      id: fila.id,
      fecha: fila.created_at || '',
      email: identidad?.email || '',
      nombre: identidad?.nombre || '',
      examen: leerSimulador(fila.simuladores) || '',
      puntaje: Number(fila.puntaje) || 0,
    };
  });

  return <RendimientoCliente intentos={intentos} errorLista="" />;
}
