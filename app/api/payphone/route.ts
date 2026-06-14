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
    
    // Limpieza estricta: quitamos TODO caracter raro para no romper el banco
    const rawReference = institucion ? `${nombre} (${institucion})` : nombre || "Ecuaforma";
    const safeReference = rawReference.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9 ]/g, "").substring(0, 50);
    
    // ID único para la transacción
    const transactionId = `EC${Date.now()}`;

    // 🌟 PAYLOAD BLINDADO PARA API/LINKS
    // No enviamos URLs aquí, PayPhone usará las que configuraste en tu panel.
    const payphoneBody = {
      amount: amountInCents,
      amountWithoutTax: amountInCents,
      amountWithTax: 0,
      tax: 0,
      service: 0,
      tip: 0,
      clientTransactionId: transactionId,
      reference: safeReference,
      expireIn: 1 // VITAL: Sin este número, la base de datos de PayPhone colapsa
    };

    console.log("Enviando a PayPhone Links (Blindado):", JSON.stringify(payphoneBody));

    const payphoneResponse = await fetch('https://pay.payphonetodoesposible.com/api/Links', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` // Next.js agrega "Bearer" automáticamente aquí
      },
      body: JSON.stringify(payphoneBody),
      cache: 'no-store'
    });

    // Si el banco vuelve a escupir HTML, lo atrapamos
    const contentType = payphoneResponse.headers.get("content-type");
    if (contentType && contentType.includes("text/html")) {
        console.error("PayPhone colapsó de nuevo (HTML).");
        return NextResponse.json({ error: 'Error interno en los servidores de PayPhone.' }, { status: 500 });
    }

    const data = await payphoneResponse.json();

    if (!payphoneResponse.ok) {
      console.error("PayPhone rechazó los datos:", data);
      return NextResponse.json({ error: data.message || 'Error en PayPhone' }, { status: 400 });
    }

    // El endpoint api/Links devuelve directamente 'url'
    return NextResponse.json({ url: data.url });

  } catch (error) {
    console.error("Error crítico en Vercel:", error);
    return NextResponse.json({ error: 'Error procesando el pago' }, { status: 500 });
  }
}