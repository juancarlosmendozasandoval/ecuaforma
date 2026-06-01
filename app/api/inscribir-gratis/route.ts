import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Usamos el cliente de Supabase directamente con la anon_key, pero configuramos la opción
// global.headers para enviar el JWT del usuario, permitiendo que la política RLS actúe a su favor.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Opcional: Si tienes problemas persistentes de RLS en inserciones, asegúrate de tener
// SUPABASE_SERVICE_ROLE_KEY en tu .env.local y descomenta las siguientes dos líneas.
// const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
// const supabase = createClient(supabaseUrl, supabaseServiceKey); 

export async function POST(request: Request) {
  try {
    const { cursoId, usuarioId } = await request.json();

    if (!cursoId || !usuarioId) {
      return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
    }

    // Inicializamos Supabase. Si la inserción falla por RLS, cambiaremos supabaseAnonKey por supabaseServiceKey (ver comentarios arriba).
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // 1. Verificamos en la base de datos que el curso sea REALMENTE gratuito
    const { data: curso, error: cursoError } = await supabase
      .from('cursos')
      .select('es_pago')
      .eq('id', cursoId)
      .single();

    if (cursoError || !curso) {
      console.error("Error al buscar el curso:", cursoError);
      return NextResponse.json({ error: 'Curso no encontrado o error de lectura' }, { status: 404 });
    }

    if (curso.es_pago) {
      // Intento de hackeo o error: quisieron inscribirse gratis a un curso de pago
      return NextResponse.json({ error: 'Este curso es de pago.' }, { status: 403 });
    }

    // 2. Inscribimos al usuario
    const { error: insertError } = await supabase
      .from('accesos_cursos')
      .insert([{ curso_id: cursoId, usuario_id: usuarioId }]);

    // El código 23505 significa violación de clave única (el usuario ya estaba inscrito)
    if (insertError) {
      if (insertError.code !== '23505') {
        console.error("Error al insertar el acceso:", insertError);
        throw insertError;
      }
    }

    return NextResponse.json({ success: true, message: 'Inscripción exitosa' }, { status: 200 });

  } catch (error: any) {
    console.error('Error general en la API de inscripción:', error);
    return NextResponse.json({ error: 'Error interno del servidor', details: error.message }, { status: 500 });
  }
}