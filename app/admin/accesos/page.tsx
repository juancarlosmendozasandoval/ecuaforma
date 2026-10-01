import { requireAdmin } from '@/lib/auth/requireAdmin';
import { createAdminClient } from '@/lib/supabase/admin';
import AccesosCliente, { type AlumnoAcceso, type CursoOpcion, type MatriculaAcceso, type SimuladorOpcion } from './AccesosCliente';

export const dynamic = 'force-dynamic';

function leerNombre(metadata: Record<string, unknown> | null | undefined) {
  const meta = metadata || {};
  const completo = typeof meta.full_name === 'string' ? meta.full_name.trim() : '';
  const corto = typeof meta.name === 'string' ? meta.name.trim() : '';
  return completo || corto || '';
}

async function listarAlumnos(admin: ReturnType<typeof createAdminClient>): Promise<AlumnoAcceso[]> {
  const alumnos: AlumnoAcceso[] = [];
  const porPagina = 200;

  for (let pagina = 1; pagina <= 20; pagina++) {
    const { data, error } = await admin.auth.admin.listUsers({ page: pagina, perPage: porPagina });
    if (error) throw error;
    const usuarios = data?.users || [];
    for (const usuario of usuarios) {
      alumnos.push({
        id: usuario.id,
        email: usuario.email || '',
        nombre: leerNombre(usuario.user_metadata as Record<string, unknown> | null),
      });
    }
    if (usuarios.length < porPagina) break;
  }

  return alumnos.sort((a, b) => (a.email || a.nombre).localeCompare(b.email || b.nombre, 'es'));
}

export default async function AccesosPage() {
  await requireAdmin();

  let alumnos: AlumnoAcceso[] = [];
  let cursos: CursoOpcion[] = [];
  let matriculas: MatriculaAcceso[] = [];
  let simuladores: SimuladorOpcion[] = [];
  let errorLista = '';

  try {
    const admin = createAdminClient();
    const [lista, cursosRes, accesosRes, simsRes] = await Promise.all([
      listarAlumnos(admin),
      admin.from('cursos').select('id, nombre, institucion').eq('is_deleted', false).order('nombre'),
      admin.from('accesos_cursos').select('id, usuario_id, curso_id, creado_en'),
      admin.from('simuladores').select('id, nombre, institucion').eq('is_deleted', false).order('nombre'),
    ]);

    if (cursosRes.error) throw cursosRes.error;
    if (accesosRes.error) throw accesosRes.error;
    if (simsRes.error) throw simsRes.error;

    alumnos = lista;
    cursos = (cursosRes.data || []).map((curso) => ({
      id: curso.id,
      nombre: curso.nombre || '',
      institucion: curso.institucion || '',
    }));
    matriculas = (accesosRes.data || []).map((fila) => ({
      id: fila.id,
      usuarioId: fila.usuario_id,
      cursoId: fila.curso_id,
      creadoEn: fila.creado_en || '',
    }));
    simuladores = (simsRes.data || []).map((sim) => ({
      id: sim.id,
      nombre: sim.nombre || '',
      institucion: sim.institucion || '',
    }));
  } catch (error) {
    console.error('Error al cargar el gestor de matrículas:', error);
    errorLista = 'No se pudieron cargar los alumnos o las matrículas.';
  }

  return (
    <AccesosCliente
      alumnos={alumnos}
      cursos={cursos}
      matriculas={matriculas}
      simuladores={simuladores}
      errorLista={errorLista}
    />
  );
}
