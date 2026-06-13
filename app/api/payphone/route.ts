import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { nombre, precio, institucion } = body;

    // 1. Verificamos que el token exista en Vercel antes de llamar al banco
    if (!process.env.PAYPHONE_TOKEN) {
      console.error("Falta el PAYPHONE_TOKEN en las variables de entorno");
      return NextResponse.json({ error: 'Error de configuración del servidor' }, { status: 500 });
    }

    const amountInCents = Math.round(parseFloat(precio) * 100);
    const referenceText = institucion ? `${nombre} (${institucion})` : nombre;
    const transactionId = `ECUAFORMA-${Date.now()}`;

    const payphoneBody = {
      amount: amountInCents,
      amountWithoutTax: amountInCents,
      amountWithTax: 0,
      tax: 0,
      currency: "USD",
      clientTransactionId: transactionId,
      reference: referenceText.substring(0, 50),
      responseUrl: process.env.NEXT_PUBLIC_BASE_URL 
        ? `${process.env.NEXT_PUBLIC_BASE_URL}/mis-cursos` 
        : "http://localhost:3000/mis-cursos",
      cancellationUrl: process.env.NEXT_PUBLIC_BASE_URL 
        ? `${process.env.NEXT_PUBLIC_BASE_URL}/checkout` 
        : "http://localhost:3000/checkout"
    };

    // 2. URL CORREGIDA: api/button/Prepare
    const payphoneResponse = await fetch('https://pay.payphonetodoesposible.com/api/button/Prepare', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.PAYPHONE_TOKEN}`
      },
      body: JSON.stringify(payphoneBody)
    });

    // 3. Escudo protector: Si el banco devuelve HTML en vez de datos, lo interceptamos
    const contentType = payphoneResponse.headers.get("content-type");
    if (contentType && contentType.includes("text/html")) {
        const text = await payphoneResponse.text();
        console.error("PayPhone devolvió HTML en vez de JSON:", text);
        return NextResponse.json({ error: 'El banco rechazó la solicitud (Respuesta HTML)' }, { status: 500 });
    }

    const data = await payphoneResponse.json();

    if (!payphoneResponse.ok) {
      console.error("Error devuelto por PayPhone:", data);
      return NextResponse.json({ error: 'No se pudo generar el link de pago' }, { status: 400 });
    }

    // 4. El endpoint button/Prepare nos entrega el link en la variable paymentUrl
    return NextResponse.json({ url: data.paymentUrl });

  } catch (error) {
    console.error("Error interno del servidor en ruta PayPhone:", error);
    return NextResponse.json({ error: 'Error interno procesando el pago' }, { status: 500 });
  }
}