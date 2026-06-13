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
    
    // Limpieza de caracteres para que el banco no rechace tildes o caracteres especiales
    const rawReference = institucion ? `${nombre} (${institucion})` : nombre || "Acceso Ecuaforma";
    const safeReference = rawReference.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9 ()-]/g, "").substring(0, 50);
    
    const transactionId = `EC-${Date.now()}`;

    // Payload limpio y seguro
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
      // URLs seguras (HTTPS) para evitar que PayPhone bloquee la transacción
      responseUrl: "https://www.ecuaforma.com/mis-cursos",
      cancellationUrl: "https://www.ecuaforma.com/checkout"
    };

    console.log("Enviando a PayPhone button/Prepare:", JSON.stringify(payphoneBody));

    // El endpoint correcto para redirecciones en la web es button/Prepare
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
        const text = await payphoneResponse.text();
        console.error("PayPhone colapsó (HTML):", text);
        return NextResponse.json({ error: 'El servidor del banco falló.' }, { status: 500 });
    }

    const data = await payphoneResponse.json();

    if (!payphoneResponse.ok) {
      console.error("PayPhone rechazó los datos:", data);
      return NextResponse.json({ error: data.message || 'Error en PayPhone' }, { status: 400 });
    }

    // Retornamos la URL de pago segura del banco
    return NextResponse.json({ url: data.paymentUrl });

  } catch (error) {
    console.error("Error crítico interno:", error);
    return NextResponse.json({ error: 'Error procesando el pago' }, { status: 500 });
  }
}