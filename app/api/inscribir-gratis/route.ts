import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const { cursoId, usuarioId } = await request.json();

    if (!cursoId || !usuarioId) {
      return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
    }

    // 🌟 LA CLAVE ESTÁ AQUÍ: Usamos el SERVICE ROLE KEY.
    // Esto le da a este bloque de código poderes absolutos para insertar
    // el acceso en la base de datos, ignorando el bloqueo del RLS.
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY! 
    );

    // 1. Verificamos que el curso sea REALMENTE gratuito
    const { data: curso, error: cursoError } = await supabaseAdmin
      .from('cursos')
      .select('es_pago')
      .eq('id', cursoId)
      .single();

    if (cursoError || !curso) {
      console.error("Error al buscar el curso:", cursoError);
      return NextResponse.json({ error: 'Curso no encontrado' }, { status: 404 });
    }

    if (curso.es_pago) {
      return NextResponse.json({ error: 'Este curso es de pago.' }, { status: 403 });
    }

    // 2. Inscribimos al usuario con poder de administrador
    const { error: insertError } = await supabaseAdmin
      .from('accesos_cursos')
      .insert([{ curso_id: cursoId, usuario_id: usuarioId }]);

    // El código 23505 significa violación de clave única (el usuario ya estaba inscrito)
    if (insertError && insertError.code !== '23505') {
      console.error("Error de Base de Datos:", insertError);
      throw insertError;
    }

    return NextResponse.json({ success: true, message: 'Inscripción exitosa' }, { status: 200 });

  } catch (error: any) {
    console.error('Error general en la API de inscripción:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}