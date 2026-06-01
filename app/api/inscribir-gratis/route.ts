import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const { cursoId, usuarioId } = await request.json();

    if (!cursoId || !usuarioId) {
      return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
    }

    // 🌟 Usamos el SERVICE ROLE KEY para saltar RLS
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

    // 2. Inscribimos al usuario
    const { error: insertError } = await supabaseAdmin
      .from('accesos_cursos')
      .insert([{ curso_id: cursoId, usuario_id: usuarioId }]);

    // 🌟 CORRECCIÓN: Manejo correcto del error 23505 (Ya inscrito)
    if (insertError) {
      if (insertError.code === '23505') {
        // Si ya está inscrito, no es un error, es un éxito.
        return NextResponse.json({ success: true, message: 'Ya estabas inscrito' }, { status: 200 });
      } else {
        // Si es otro tipo de error, sí lo registramos y lanzamos
        console.error("Error de Base de Datos al insertar:", insertError);
        return NextResponse.json({ error: 'Error al registrar acceso' }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true, message: 'Inscripción exitosa' }, { status: 200 });

  } catch (error: any) {
    console.error('Error general en la API de inscripción:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}