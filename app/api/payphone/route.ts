import { NextResponse } from 'next/server';
import axios from 'axios';

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
    
    // Limpieza de caracteres
    const rawReference = institucion ? `${nombre} (${institucion})` : nombre || "Ecuaforma";
    const safeReference = rawReference.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9 ()-]/g, "").substring(0, 50);

    // 🌟 CORRECCIÓN AQUÍ: Agregamos el nombre del curso a la URL de respuesta
    const urlRespuesta = `https://www.ecuaforma.com/mis-cursos?curso=${encodeURIComponent(nombre)}`;

    // Payload con el StoreId correcto
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
      storeId: "f2a3b1bc-f8bd-4d5a-9d5a-22648de632b4",
      responseUrl: urlRespuesta, // 🌟 Usamos la URL dinámica aquí
      cancellationUrl: "https://www.ecuaforma.com/checkout"
    };

    const response = await axios.post(
      'https://pay.payphonetodoesposible.com/api/button/Prepare',
      payphoneBody,
      {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        validateStatus: function (status) {
          return status >= 200 && status < 600; 
        }
      }
    );

    if (typeof response.data === 'string' && response.data.includes('<html')) {
        console.error("=================== ERROR HTML DE PAYPHONE ===================");
        console.error(response.data);
        console.error("==============================================================");
        return NextResponse.json({ error: 'Error del banco. Revisa los logs.' }, { status: 500 });
    }

    if (response.status !== 200) {
      console.error("PayPhone rechazó los datos (Axios):", response.data);
      return NextResponse.json({ error: response.data?.message || 'Error en PayPhone' }, { status: 400 });
    }

    console.log("¡ÉXITO! Respuesta de PayPhone:", JSON.stringify(response.data));

    // Capturamos el link exacto que nos mandó el banco
    const linkDePago = response.data.payWithCard || response.data.payWithPayPhone;

    if (!linkDePago) {
      console.error("El banco respondió 200, pero no incluyó un enlace válido.");
      return NextResponse.json({ error: 'Respuesta incompleta del banco' }, { status: 500 });
    }

    // Le devolvemos el link a tu frontend
    return NextResponse.json({ url: linkDePago });

  } catch (error) {
    console.error("Error crítico interno (Axios):", error);
    return NextResponse.json({ error: 'Error procesando el pago' }, { status: 500 });
  }
}