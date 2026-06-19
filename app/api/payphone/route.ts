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
    const transactionId = `EC${Date.now()}`;
    
    // Limpieza de caracteres para evitar bloqueos del banco
    const rawReference = institucion ? `${nombre} (${institucion})` : nombre || "Ecuaforma";
    const safeReference = rawReference.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9 ()-]/g, "").substring(0, 50);

    // 🌟 PAYLOAD CON EL VERDADERO STORE ID
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
      storeId: "f2a3b1bc-f8bd-4d5a-9d5a-22648de632b4", // ¡El UUID correcto de tu sucursal!
      responseUrl: "https://www.ecuaforma.com/mis-cursos",
      cancellationUrl: "https://www.ecuaforma.com/checkout"
    };

    console.log("Enviando a PayPhone Prepare (Con verdadero StoreId):", JSON.stringify(payphoneBody));

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
        console.error("=================== ERROR HTML DE PAYPHONE ===================");
        console.error(text);
        console.error("==============================================================");
        return NextResponse.json({ error: 'Error del banco. Revisa los logs.' }, { status: 500 });
    }

    const data = await payphoneResponse.json();

    if (!payphoneResponse.ok) {
      console.error("PayPhone rechazó los datos (JSON):", data);
      return NextResponse.json({ error: data.message || 'Error en PayPhone' }, { status: 400 });
    }

    // Retornamos la URL de la ventana de pago seguro
    return NextResponse.json({ url: data.paymentUrl });

  } catch (error) {
    console.error("Error crítico interno:", error);
    return NextResponse.json({ error: 'Error procesando el pago' }, { status: 500 });
  }
}