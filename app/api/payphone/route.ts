import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { nombre, precio, institucion } = body;

    // PayPhone exige que los valores se envíen en CENTAVOS y como números enteros.
    // Ejemplo: $10.00 -> 1000
    const amountInCents = Math.round(parseFloat(precio) * 100);
    const referenceText = institucion ? `${nombre} (${institucion})` : nombre;
    
    // Generamos un ID único para esta transacción
    const transactionId = `ECUAFORMA-${Date.now()}`;

    // Cuerpo de la petición para PayPhone
    const payphoneBody = {
      amount: amountInCents,
      amountWithoutTax: amountInCents,
      amountWithTax: 0,
      tax: 0,
      clientTransactionId: transactionId,
      reference: referenceText.substring(0, 50), // PayPhone a veces limita los caracteres
      // A dónde regresa el usuario tras pagar (luego lo cambiaremos a tu dominio real)
      responseUrl: process.env.NEXT_PUBLIC_BASE_URL 
        ? `${process.env.NEXT_PUBLIC_BASE_URL}/mis-cursos` 
        : "http://localhost:3000/mis-cursos"
    };

    const payphoneResponse = await fetch('https://pay.payphonetodoesposible.com/api/Links', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.PAYPHONE_TOKEN}`
      },
      body: JSON.stringify(payphoneBody)
    });

    const data = await payphoneResponse.json();

    if (!payphoneResponse.ok) {
      console.error("Error de PayPhone:", data);
      return NextResponse.json({ error: 'No se pudo generar el link de pago' }, { status: 400 });
    }

    // Retornamos la URL de pago generada por el banco
    return NextResponse.json({ url: data.url });

  } catch (error) {
    console.error("Error interno del servidor:", error);
    return NextResponse.json({ error: 'Error interno procesando el pago' }, { status: 500 });
  }
}