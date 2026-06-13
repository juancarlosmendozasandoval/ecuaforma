import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { nombre, precio, institucion } = body;

    // Limpiamos el token por si se copió con espacios en blanco invisibles
    const token = process.env.PAYPHONE_TOKEN?.trim();
    if (!token) {
      return NextResponse.json({ error: 'Falta configurar el Token' }, { status: 500 });
    }

    const amountInCents = Math.round(parseFloat(precio) * 100);
    
    // El servidor de PayPhone a veces colapsa si recibe tildes o caracteres raros.
    // Aquí limpiamos el nombre (Ej: "Matemáticas (FAE)" -> "Matematicas (FAE)")
    const rawReference = institucion ? `${nombre} (${institucion})` : nombre || "Acceso Ecuaforma";
    const safeReference = rawReference.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9 ()-]/g, "").substring(0, 50);
    
    // Generamos un ID más corto
    const transactionId = `EC-${Date.now()}`;

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
      responseUrl: process.env.NEXT_PUBLIC_BASE_URL 
        ? `${process.env.NEXT_PUBLIC_BASE_URL}/mis-cursos` 
        : "http://localhost:3000/mis-cursos",
      cancellationUrl: process.env.NEXT_PUBLIC_BASE_URL 
        ? `${process.env.NEXT_PUBLIC_BASE_URL}/checkout` 
        : "http://localhost:3000/checkout"
    };

    // Imprimimos los datos exactos en Vercel para depuración
    console.log("Datos enviados a PayPhone:", JSON.stringify(payphoneBody));

    const payphoneResponse = await fetch('https://pay.payphonetodoesposible.com/api/button/Prepare', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json', // Súper importante para evitar el error HTML
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payphoneBody),
      cache: 'no-store'
    });

    const contentType = payphoneResponse.headers.get("content-type");
    if (contentType && contentType.includes("text/html")) {
        const text = await payphoneResponse.text();
        console.error("PayPhone devolvió HTML (Posible caída de su API):", text);
        return NextResponse.json({ error: 'Error en los servidores del banco' }, { status: 500 });
    }

    const data = await payphoneResponse.json();

    if (!payphoneResponse.ok) {
      console.error("PayPhone rechazó los datos:", data);
      return NextResponse.json({ error: data.message || 'Error en PayPhone' }, { status: 400 });
    }

    return NextResponse.json({ url: data.paymentUrl });

  } catch (error) {
    console.error("Error crítico interno:", error);
    return NextResponse.json({ error: 'Error procesando el pago' }, { status: 500 });
  }
}