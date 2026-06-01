import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Usamos las claves de entorno de tu servidor para saltar la política RLS de Supabase de forma segura.
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const { cursoId, usuarioId } = await request.json();

    if (!cursoId || !usuarioId) {
      return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
    }

    // 1. Verificamos en la base de datos que el curso sea REALMENTE gratuito
    const { data: curso, error: cursoError } = await supabaseAdmin
      .from('cursos')
      .select('es_pago')
      .eq('id', cursoId)
      .single();

    if (cursoError || !curso) {
      return NextResponse.json({ error: 'Curso no encontrado' }, { status: 404 });
    }

    if (curso.es_pago) {
      // Intento de hackeo o error: quisieron inscribirse gratis a un curso de pago
      return NextResponse.json({ error: 'Este curso es de pago.' }, { status: 403 });
    }

    // 2. Inscribimos al usuario
    const { error: insertError } = await supabaseAdmin
      .from('accesos_cursos')
      .insert([{ curso_id: cursoId, usuario_id: usuarioId }]);

    // El código 23505 significa que el usuario ya estaba inscrito, no pasa nada
    if (insertError && insertError.code !== '23505') {
      throw insertError;
    }

    return NextResponse.json({ success: true, message: 'Inscripción exitosa' }, { status: 200 });

  } catch (error: any) {
    console.error('Error al inscribir:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}