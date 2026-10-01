import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import { esCursoDePago } from '@/lib/cursos/acceso';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Matricula al usuario de la sesión en un curso gratuito.
 * El ID del usuario sale SIEMPRE de la sesión; cualquier `usuarioId` del body se ignora.
 */
export async function POST(request: Request) {
  try {
    // 1. Usuario real de la sesión
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Debes iniciar sesión para inscribirte.' }, { status: 401 });
    }

    // 2. Validar la entrada: solo el UUID del curso
    const body = await request.json().catch(() => null);
    const cursoId = body?.cursoId;
    if (typeof cursoId !== 'string' || !UUID_REGEX.test(cursoId)) {
      return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
    }

    // 3. Verificar que el curso exista, no esté eliminado y sea REALMENTE gratuito
    const admin = createAdminClient();
    const { data: curso } = await admin
      .from('cursos')
      .select('es_pago, precio, is_deleted')
      .eq('id', cursoId)
      .maybeSingle();

    if (!curso || curso.is_deleted) {
      return NextResponse.json({ error: 'Curso no encontrado' }, { status: 404 });
    }
    if (esCursoDePago(curso)) {
      return NextResponse.json({ error: 'Este curso es de pago.' }, { status: 403 });
    }

    // 4. Matrícula idempotente (índice único usuario_id + curso_id)
    const { error: insertError } = await admin
      .from('accesos_cursos')
      .upsert(
        { curso_id: cursoId, usuario_id: user.id },
        { onConflict: 'usuario_id,curso_id', ignoreDuplicates: true }
      );

    if (insertError) {
      console.error('[INSCRIBIR GRATIS] Error al insertar:', insertError.code);
      return NextResponse.json({ error: 'Error al registrar acceso' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Inscripción exitosa' }, { status: 200 });
  } catch (error) {
    console.error('[INSCRIBIR GRATIS] Error general:', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
