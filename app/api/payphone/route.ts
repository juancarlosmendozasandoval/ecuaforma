import { NextResponse } from 'next/server';
import axios from 'axios';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    // 1. Obtenemos el usuario que está intentando pagar
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    const { data: { user } } = await supabase.auth.getUser();

    const body = await request.json();
    const { nombre, precio, institucion } = body;

    const token = process.env.PAYPHONE_TOKEN?.trim();
    if (!token) {
      return NextResponse.json({ error: 'Falta configurar el Token' }, { status: 500 });
    }

    const amountInCents = Math.round(parseFloat(precio) * 100);
    const transactionId = `EC${Date.now()}`;
    
    const rawReference = institucion ? `${nombre} (${institucion})` : nombre || "Ecuaforma";
    const safeReference = rawReference.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9 ()-]/g, "").substring(0, 50);

    const urlRespuesta = `https://www.ecuaforma.com/mis-cursos?curso=${encodeURIComponent(nombre)}&institucion=${encodeURIComponent(institucion || '')}`;

    const payphoneBody = {
      amount: amountInCents,
      amountWithoutTax: amountInCents,
      amountWithTax: 0,
      tax: 0,
      service: 0,
      tip: 0,
      currency: "USD",
      clientTransactionId: transactionId,
      reference: safeReference,
      storeId: "f2a3b1bc-f8bd-4d5a-9d5a-22648de632b4",
      responseUrl: urlRespuesta,
      cancellationUrl: "https://www.ecuaforma.com/checkout",
      // 🌟 INYECCIÓN PARA EL WEBHOOK: Enviamos datos clave escondidos al banco
      optionalParameter1: user?.id || 'anonimo',
      optionalParameter2: nombre,
      optionalParameter3: institucion || "N/A"
    };

    const response = await axios.post(
      'https://pay.payphonetodoesposible.com/api/button/Prepare',
      payphoneBody,
      {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        validateStatus: function (status) {
          return status >= 200 && status < 600; 
        }
      }
    );

    if (typeof response.data === 'string' && response.data.includes('<html')) {
        console.error("=================== ERROR HTML DE PAYPHONE ===================");
        return NextResponse.json({ error: 'Error del banco. Revisa los logs.' }, { status: 500 });
    }

    if (response.status !== 200) {
      return NextResponse.json({ error: response.data?.message || 'Error en PayPhone' }, { status: 400 });
    }

    const linkDePago = response.data.payWithCard || response.data.payWithPayPhone;

    if (!linkDePago) {
      return NextResponse.json({ error: 'Respuesta incompleta del banco' }, { status: 500 });
    }

    return NextResponse.json({ url: linkDePago });

  } catch (error) {
    console.error("Error crítico interno (Axios):", error);
    return NextResponse.json({ error: 'Error procesando el pago' }, { status: 500 });
  }
}