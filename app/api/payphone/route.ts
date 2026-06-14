import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { precio } = body; // Ya ni siquiera enviamos el nombre para evitar conflictos

    const token = process.env.PAYPHONE_TOKEN?.trim();
    if (!token) {
      return NextResponse.json({ error: 'Falta configurar el Token' }, { status: 500 });
    }

    const amountInCents = Math.round(parseFloat(precio) * 100);
    const transactionId = `EC${Date.now()}`;

    // 🌟 PAYLOAD MINIMALISTA ESTRICTO
    // Solo los datos que el "Tipo de Aplicación: Web" soporta sin colapsar
    const payphoneBody = {
      amount: amountInCents,
      amountWithoutTax: amountInCents,
      amountWithTax: 0,
      tax: 0,
      clientTransactionId: transactionId,
      // Exactamente las URLs de tu panel:
      responseUrl: "https://www.ecuaforma.com/mis-cursos",
      cancellationUrl: "https://www.ecuaforma.com/mis-cursos" 
    };

    console.log("Enviando a PayPhone Prepare (Minimalista):", JSON.stringify(payphoneBody));

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

    const contentType = payphoneResponse.headers.get("content-type");
    if (contentType && contentType.includes("text/html")) {
        console.error("PayPhone colapsó (HTML) por esquema incorrecto.");
        return NextResponse.json({ error: 'Error del banco. Revisa configuración.' }, { status: 500 });
    }

    const data = await payphoneResponse.json();

    if (!payphoneResponse.ok) {
      console.error("PayPhone rechazó los datos:", data);
      return NextResponse.json({ error: data.message || 'Error en PayPhone' }, { status: 400 });
    }

    return NextResponse.json({ url: data.paymentUrl });

  } catch (error) {
    console.error("Error interno:", error);
    return NextResponse.json({ error: 'Error procesando el pago' }, { status: 500 });
  }
}