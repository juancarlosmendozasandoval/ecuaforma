import 'server-only';
import { plantillaBienvenida } from '@/lib/email/bienvenida';
import { sendEmail } from '@/lib/email/sendEmail';
import { createAdminClient } from '@/lib/supabase/admin';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type ResultadoMatricula =
  | { ok: true; yaInscrito: boolean }
  | { ok: false; motivo: 'curso_desconocido' | 'usuario' | 'matricula' };

/**
 * Busca el curso por id, slug o nombre y matricula al correo.
 * Si el alumno aún no tiene cuenta, crea una confirmada, sin contraseña,
 * para que luego entre con Google usando ese mismo correo.
 */
export async function matricularPorPago(email: string, cursoRef: string): Promise<ResultadoMatricula> {
  const admin = createAdminClient();
  const curso = await resolverCurso(admin, cursoRef);
  if (!curso) return { ok: false, motivo: 'curso_desconocido' };

  const usuarioId = await asegurarUsuario(admin, email);
  if (!usuarioId) return { ok: false, motivo: 'usuario' };

  const { error } = await admin.from('accesos_cursos').insert({
    usuario_id: usuarioId,
    curso_id: curso.id,
  });

  if (error?.code === '23505') return { ok: true, yaInscrito: true };
  if (error) {
    console.error('No se pudo matricular por pago:', error.code);
    return { ok: false, motivo: 'matricula' };
  }

  const nombreCurso = curso.nombre.trim() || 'tu curso';
  void sendEmail(email, '¡Bienvenido a Ecuaforma!', plantillaBienvenida(nombreCurso)).catch((errorEnvio) => {
    console.error('No se pudo enviar la bienvenida del pago:', errorEnvio);
  });

  return { ok: true, yaInscrito: false };
}

async function resolverCurso(admin: ReturnType<typeof createAdminClient>, ref: string) {
  if (UUID.test(ref)) {
    const { data } = await admin
      .from('cursos')
      .select('id, nombre')
      .eq('id', ref)
      .eq('is_deleted', false)
      .maybeSingle();
    return data;
  }

  const { data: porSlug } = await admin
    .from('cursos')
    .select('id, nombre')
    .eq('slug', ref)
    .eq('is_deleted', false)
    .maybeSingle();
  if (porSlug) return porSlug;

  const patron = ref.replace(/[%_\\]/g, '\\$&');
  const { data: porNombre } = await admin
    .from('cursos')
    .select('id, nombre')
    .eq('is_deleted', false)
    .ilike('nombre', patron);

  const exactos = (porNombre || []).filter((curso) => curso.nombre.toLowerCase() === ref.toLowerCase());
  return exactos.length === 1 ? exactos[0] : null;
}

async function asegurarUsuario(admin: ReturnType<typeof createAdminClient>, email: string) {
  const existente = await buscarUsuarioId(email);
  if (existente) return existente;

  const { data, error } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
  });
  if (data.user?.id) return data.user.id;

  const yaExistia = error?.status === 422 || /already|registered|exists/i.test(error?.message || '');
  if (!yaExistia) {
    console.error('No se pudo crear la cuenta del pago:', error?.message || 'sin detalle');
    return null;
  }

  return (await buscarUsuarioId(email)) || (await buscarUsuarioEnPaginas(admin, email));
}

async function buscarUsuarioId(email: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;

  const respuesta = await fetch(`${url}/auth/v1/admin/users?filter=${encodeURIComponent(email)}`, {
    headers: { Authorization: `Bearer ${key}`, apikey: key },
    cache: 'no-store',
  });
  if (!respuesta.ok) return null;

  const cuerpo = (await respuesta.json().catch(() => null)) as { users?: { id?: string; email?: string }[] } | null;
  const usuarios = Array.isArray(cuerpo?.users) ? cuerpo.users : [];
  return usuarios.find((usuario) => (usuario.email || '').toLowerCase() === email)?.id || null;
}

async function buscarUsuarioEnPaginas(admin: ReturnType<typeof createAdminClient>, email: string) {
  for (let pagina = 1; pagina <= 20; pagina += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page: pagina, perPage: 200 });
    if (error) return null;
    const encontrado = data.users.find((usuario) => (usuario.email || '').toLowerCase() === email);
    if (encontrado?.id) return encontrado.id;
    if (data.users.length < 200) return null;
  }
  return null;
}
