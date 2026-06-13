import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { nombre, precio, institucion } = body;

    const token = process.env.PAYPHONE_TOKEN?.trim();
    if (!token) {
      return NextResponse.json({ error: 'Falta configurar el Token' }, { status: 500 });
    }

    const amountInCents = Math.round(parseFloat(precio) * 100);
    
    // Limpieza de caracteres que puedan romper el servidor del banco
    const rawReference = institucion ? `${nombre} (${institucion})` : nombre || "Acceso Ecuaforma";
    const safeReference = rawReference.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9 ()-]/g, "").substring(0, 50);
    
    const transactionId = `EC${Date.now()}`;

    // 🌟 MAGIA: Obtenemos el dominio real donde está el usuario automáticamente
    const origin = request.headers.get('origin') || 'https://www.ecuaforma.com';

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
      // Ahora la URL será segura y dinámica
      responseUrl: `${origin}/mis-cursos`,
      cancellationUrl: `${origin}/checkout`
    };

    console.log("Enviando a PayPhone Links:", JSON.stringify(payphoneBody));

    // Volvemos al endpoint oficial de creación de Links de pago seguros
    const payphoneResponse = await fetch('https://pay.payphonetodoesposible.com/api/Links', {
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
        const text = await payphoneResponse.text();
        console.error("PayPhone colapsó (HTML):", text);
        return NextResponse.json({ error: 'El servidor del banco falló.' }, { status: 500 });
    }

    const data = await payphoneResponse.json();

    if (!payphoneResponse.ok) {
      console.error("PayPhone rechazó los datos:", data);
      return NextResponse.json({ error: data.message || 'Error en PayPhone' }, { status: 400 });
    }

    // Retornamos la URL oficial de la pasarela
    return NextResponse.json({ url: data.url || data.paymentUrl });

  } catch (error) {
    console.error("Error crítico interno:", error);
    return NextResponse.json({ error: 'Error procesando el pago' }, { status: 500 });
  }
}