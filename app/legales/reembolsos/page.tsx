import type { Metadata } from 'next';
import Link from 'next/link';
import { CONTACTO_LEGAL } from '@/lib/legales/documentos';

export const metadata: Metadata = {
  title: 'Política de Reembolsos | Ecuaforma',
  description: 'Condiciones para solicitar la devolución del pago de un curso o simulador en Ecuaforma.',
  alternates: { canonical: '/legales/reembolsos' },
};

export default function ReembolsosPage() {
  return (
    <>
      <h1>Política de Reembolsos</h1>
      <p className="lead">
        Queremos que compres con confianza. Esta política explica cuándo puedes solicitar la devolución del valor
        pagado por un curso o simulador de Ecuaforma y cómo hacerlo.
      </p>

      <h2>1. Derecho de retracto</h2>
      <p>
        Puedes solicitar la devolución total del valor pagado dentro de los <strong>15 días calendario</strong>{' '}
        siguientes a la confirmación de tu compra, siempre que no hayas consumido una parte sustancial del contenido.
        Como referencia, consideramos consumo sustancial haber completado más del 20 % de las lecciones del curso o
        haber rendido el simulador comprado.
      </p>

      <h2>2. Casos en los que procede el reembolso</h2>
      <ul>
        <li>Solicitudes dentro del plazo de retracto que cumplan la condición anterior.</li>
        <li>Cobros duplicados o cobros por un monto distinto al publicado.</li>
        <li>Fallas técnicas atribuibles a Ecuaforma que te impidan acceder al contenido y que no resolvamos en un plazo razonable.</li>
        <li>Productos que no correspondan de forma sustancial a lo descrito en su página de venta.</li>
      </ul>

      <h2>3. Casos en los que no procede</h2>
      <ul>
        <li>Solicitudes fuera del plazo de retracto, salvo los supuestos de cobro indebido o falla imputable a Ecuaforma.</li>
        <li>Haber consumido una parte sustancial del contenido.</li>
        <li>No haber aprobado un examen de admisión o de ingreso: el resultado depende de cada estudiante y de cada institución.</li>
        <li>
          Cuentas suspendidas por incumplir los{' '}
          <Link href="/legales/terminos">Términos y Condiciones</Link> (por ejemplo, compartir la cuenta o distribuir el contenido).
        </li>
        <li>Productos ofrecidos de forma gratuita.</li>
      </ul>

      <h2>4. Cómo solicitarlo</h2>
      <ol>
        <li>
          Escríbenos a <a href={`mailto:${CONTACTO_LEGAL.email}`}>{CONTACTO_LEGAL.email}</a> o al WhatsApp{' '}
          {CONTACTO_LEGAL.whatsapp} con el correo de tu cuenta, el curso o simulador comprado, la fecha del pago y el
          motivo de la solicitud.
        </li>
        <li>Revisaremos tu solicitud y te responderemos en un plazo máximo de 5 días hábiles.</li>
        <li>Si se aprueba, retiraremos tu acceso al producto reembolsado y procesaremos la devolución.</li>
      </ol>

      <h2>5. Forma y plazo de la devolución</h2>
      <p>
        La devolución se realiza por el mismo medio de pago utilizado: reverso a la tarjeta en pagos con PayPhone,
        reembolso en PayPal o transferencia bancaria a la cuenta que nos indiques en pagos por transferencia o
        depósito. El tiempo en que el dinero se refleja depende de tu banco o de la pasarela, y suele estar entre 5
        y 30 días hábiles.
      </p>

      <h2>6. Tus derechos como consumidor</h2>
      <p>
        Esta política no limita los derechos que te reconoce la Ley Orgánica de Defensa del Consumidor del Ecuador.
        Si no estás conforme con nuestra respuesta, puedes acudir a la Defensoría del Pueblo o a las instancias
        de protección al consumidor.
      </p>
    </>
  );
}
