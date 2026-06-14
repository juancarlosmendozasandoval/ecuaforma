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
    
    // Limpieza de caracteres para que el banco no rechace tildes o símbolos
    const rawReference = institucion ? `${nombre} (${institucion})` : nombre || "Acceso Ecuaforma";
    const safeReference = rawReference.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9 ()-]/g, "").substring(0, 50);
    
    // Quitamos guiones del ID por si su validador es estricto
    const transactionId = `EC${Date.now()}`;

    // 🌟 EL SECRETO: Añadimos 'expireIn' (días) y 'currency'. 
    // Sin el número de expireIn, el servidor ASP.NET de PayPhone colapsa.
    const payphoneBody = {
      amount: amountInCents,
      amountWithoutTax: amountInCents,
      amountWithTax: 0,
      tax: 0,
      clientTransactionId: transactionId,
      reference: safeReference,
      expireIn: 1, // Obligatorio: El link expirará en 1 día
      currency: "USD"
    };

    console.log("Enviando a PayPhone Links (Payload final):", JSON.stringify(payphoneBody));

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

    // Retornamos el link directo generado por el banco
    return NextResponse.json({ url: data.url });

  } catch (error) {
    console.error("Error crítico interno:", error);
    return NextResponse.json({ error: 'Error procesando el pago' }, { status: 500 });
  }
}