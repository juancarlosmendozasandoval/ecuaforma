import 'server-only';
import { Resend } from 'resend';

/**
 * Envía un correo con Resend.
 * Requiere `RESEND_API_KEY`. El remitente sale de `RESEND_FROM`
 * (un dominio verificado en Resend). Si no está, usa el remitente de prueba.
 */
export async function sendEmail(to: string, subject: string, html: string) {
  const destino = to.trim();
  if (!destino) {
    console.error('No se envió el correo: el destinatario está vacío.');
    return;
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('No se envió el correo: falta RESEND_API_KEY.');
    return;
  }

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM || 'Ecuaforma <onboarding@resend.dev>',
    to: destino,
    subject,
    html,
  });

  if (error) {
    throw new Error(error.message);
  }
}
