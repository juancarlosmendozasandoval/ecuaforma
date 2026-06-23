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
      responseUrl: "https://www.ecuaforma.com/mis-cursos",
      cancellationUrl: "https://www.ecuaforma.com/checkout"
    };

    console.log("Enviando a PayPhone mediante AXIOS...");

    // 🌟 LA MAGIA: Usamos Axios en lugar de Fetch
    const response = await axios.post(
      'https://pay.payphonetodoesposible.com/api/button/Prepare',
      payphoneBody,
      {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        // Esto evita que Axios se detenga si el banco envía un error, 
        // para poder leer el mensaje real.
        validateStatus: function (status) {
          return status >= 200 && status < 600; 
        }
      }
    );

    // Si el banco vuelve a escupir HTML, lo atrapamos
    if (typeof response.data === 'string' && response.data.includes('<html')) {
        console.error("=================== ERROR HTML DE PAYPHONE ===================");
        console.error(response.data);
        console.error("==============================================================");
        return NextResponse.json({ error: 'Error del banco. Revisa los logs.' }, { status: 500 });
    }

    // Si la petición no fue exitosa (diferente de 200 OK)
    if (response.status !== 200) {
      console.error("PayPhone rechazó los datos (Axios):", response.data);
      return NextResponse.json({ error: response.data?.message || 'Error en PayPhone' }, { status: 400 });
    }

    // Retornamos la URL generada
    return NextResponse.json({ url: response.data.paymentUrl });

  } catch (error) {
    console.error("Error crítico interno (Axios):", error);
    return NextResponse.json({ error: 'Error procesando el pago' }, { status: 500 });
  }
}