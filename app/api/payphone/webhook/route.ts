import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    // 1. PayPhone envía el ID de la transacción a esta ruta
    const body = await request.json();
    const paymentId = body.id || body.transactionId;

    if (!paymentId) {
      return NextResponse.json({ error: 'No ID provided' }, { status: 400 });
    }

    const token = process.env.PAYPHONE_TOKEN?.trim();

    // 2. Verificamos con el banco el estado actual y real de esa transacción
    const verifyResponse = await fetch(`https://pay.payphonetodoesposible.com/api/Transactions/${paymentId}`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` },
      cache: 'no-store'
    });

    if (!verifyResponse.ok) {
      return NextResponse.json({ error: 'No se pudo verificar con PayPhone' }, { status: 500 });
    }

    const verifyData = await verifyResponse.json();
    const status = verifyData.transactionStatus; // Puede ser "Approved", "Reversed", "Canceled"
    
    // Recuperamos los datos ocultos que inyectamos en el paso 1
    const userId = verifyData.optionalParameter1;
    const nombreCurso = verifyData.optionalParameter2;
    const institucion = verifyData.optionalParameter3 === "N/A" ? "" : verifyData.optionalParameter3;

    if (!userId || userId === 'anonimo' || !nombreCurso) {
       console.log("Webhook ignorado: Faltan metadatos del usuario o curso.");
       return NextResponse.json({ message: 'Ignorado' }, { status: 200 });
    }

    // 3. Inicializamos Supabase en Modo Dios
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL as string,
      process.env.SUPABASE_SERVICE_ROLE_KEY as string,
      { auth: { persistSession: false } }
    );

    // 4. Identificamos el curso exacto
    const { data: listaCursos } = await supabaseAdmin.from('cursos').select('id, nombre, institucion');
    
    const cursoNormalizado = nombreCurso.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
    const instNormalizada = institucion ? institucion.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim() : "";
    
    const cursoEncontrado = listaCursos?.find(c => {
      const matchNombre = c.nombre.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim() === cursoNormalizado;
      const matchInst = c.institucion.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim() === instNormalizada;
      return instNormalizada ? (matchNombre && matchInst) : matchNombre;
    });

    if (!cursoEncontrado) {
       console.error(`[WEBHOOK ERROR] Curso no encontrado: ${nombreCurso}`);
       return NextResponse.json({ message: 'Curso no encontrado en BD' }, { status: 200 });
    }

    // 5. TOMAMOS ACCIÓN SEGÚN EL ESTADO DEL BANCO
    if (status === 'Approved') {
       // Matricular (Si no estaba ya matriculado por la página web)
       const { data: yaInscrito } = await supabaseAdmin
         .from('accesos_cursos')
         .select('id')
         .eq('usuario_id', userId)
         .eq('curso_id', cursoEncontrado.id)
         .single();

       if (!yaInscrito) {
          console.log(`[WEBHOOK] Matriculando a ${userId} en ${nombreCurso}`);
          await supabaseAdmin.from('accesos_cursos').insert({ usuario_id: userId, curso_id: cursoEncontrado.id });
       }
    } else {
       // 🚨 ¡REVERSO, CANCELACIÓN O FRAUDE! Le quitamos el acceso al instante
       console.log(`[WEBHOOK] Estado ${status}: Revocando acceso a ${userId} para ${nombreCurso}`);
       await supabaseAdmin
         .from('accesos_cursos')
         .delete()
         .eq('usuario_id', userId)
         .eq('curso_id', cursoEncontrado.id);
    }

    // Le decimos a PayPhone que recibimos el mensaje fuerte y claro
    return NextResponse.json({ received: true, status });
  } catch (error) {
    console.error("Error crítico en Webhook:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}