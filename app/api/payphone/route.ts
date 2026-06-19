import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { precio } = body;

    const token = process.env.PAYPHONE_TOKEN?.trim();
    if (!token) {
      return NextResponse.json({ error: 'Falta configurar el Token' }, { status: 500 });
    }

    const amountInCents = Math.round(parseFloat(precio) * 100);
    const transactionId = `EC${Date.now()}`;

    // 🌟 PAYLOAD CON STORE ID
    const payphoneBody = {
      amount: amountInCents,
      amountWithoutTax: amountInCents,
      amountWithTax: 0,
      tax: 0,
      clientTransactionId: transactionId,
      storeId: "WrF9dpMWKUmK368txqnFTQ", // Tu Identificador de la Aplicación Web
      responseUrl: "https://www.ecuaforma.com/mis-cursos",
      cancellationUrl: "https://www.ecuaforma.com/mis-cursos" 
    };

    console.log("Enviando a PayPhone Prepare (Con StoreId):", JSON.stringify(payphoneBody));

    const payphoneResponse = await fetch('https://pay.payphonetodoesposible.com/api/button/Prepare', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payphoneBody),
      cache: 'no-store'
    });

    // 🌟 REVELADOR DE HTML COMPLETO
    const contentType = payphoneResponse.headers.get("content-type");
    if (contentType && contentType.includes("text/html")) {
        const text = await payphoneResponse.text();
        console.error("=================== ERROR HTML DE PAYPHONE ===================");
        console.error(text); // Imprimimos TODO el texto tal cual para buscar el mensaje oculto
        console.error("==============================================================");
        return NextResponse.json({ error: 'Error del banco. Revisa los logs de Vercel.' }, { status: 500 });
    }

    const data = await payphoneResponse.json();

    if (!payphoneResponse.ok) {
      console.error("PayPhone rechazó los datos (JSON):", data);
      return NextResponse.json({ error: data.message || 'Error en PayPhone' }, { status: 400 });
    }

    return NextResponse.json({ url: data.paymentUrl });

  } catch (error) {
    console.error("Error crítico interno:", error);
    return NextResponse.json({ error: 'Error procesando el pago' }, { status: 500 });
  }
}