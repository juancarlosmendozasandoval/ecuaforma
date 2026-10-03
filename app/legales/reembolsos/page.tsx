import type { Metadata } from 'next';
import Link from 'next/link';
import { CONTACTO_LEGAL } from '@/lib/legales/documentos';

export const metadata: Metadata = {
  title: 'Política de Reembolsos | Ecuaforma',
  description: 'Condiciones estrictas sobre reembolsos y devoluciones de los cursos y simuladores en Ecuaforma.',
  alternates: { canonical: '/legales/reembolsos' },
};

export default function ReembolsosPage() {
  return (
    <>
      <h1>Política de Reembolsos</h1>
      <p className="lead">
        En Ecuaforma trabajamos para ofrecerte la mejor preparación posible. Debido a la naturaleza de nuestros servicios, nuestras políticas de devolución son estrictas y se detallan a continuación.
      </p>

      <h2>1. Naturaleza del Producto Digital</h2>
      <p>
        Todos nuestros cursos y simuladores son <strong>productos digitales de acceso inmediato</strong>. Al realizar el pago, nuestro sistema te otorga acceso automático a bases de datos exclusivas, cuestionarios, simuladores y material intelectual desarrollado por Ecuaforma.
      </p>

      <h2>2. Política de No Reembolso</h2>
      <p>
        Por la naturaleza de acceso inmediato descrita en el punto anterior, <strong>NO se emitirán reembolsos, devoluciones ni cancelaciones</strong> bajo ninguna circunstancia una vez que el usuario haya iniciado sesión en la plataforma y accedido al contenido del curso o a los simuladores.
      </p>
      <p>
        Al marcar la casilla de aceptación de Términos y Condiciones en la pasarela de pago, reconoces y aceptas expresamente que pierdes el derecho a desistir de la compra una vez habilitado el acceso al material digital.
      </p>

      <h2>3. Casos Excepcionales</h2>
      <p>El único escenario donde procederá un reembolso del 100% del valor pagado será por:</p>
      <ul>
        <li>Cobros duplicados comprobables generados por un error técnico de nuestra pasarela de pago (PayPhone o PayPal).</li>
      </ul>
      <p>
        Si experimentas un cobro duplicado, debes notificarlo inmediatamente a <a href={`mailto:${CONTACTO_LEGAL.email}`}>{CONTACTO_LEGAL.email}</a> adjuntando los comprobantes bancarios correspondientes. El reembolso se procesará exclusivamente hacia la misma cuenta o tarjeta utilizada en la transacción original.
      </p>

      <h2>4. Resultados Académicos</h2>
      <p>
        Bajo ningún concepto se emitirán reembolsos basados en el rendimiento del estudiante en los exámenes oficiales de ingreso (Fuerzas Armadas, Policía Nacional, Universidades, etc.). Ecuaforma provee herramientas de preparación de alta calidad, pero <strong>no garantiza la obtención de cupos ni la aprobación de exámenes oficiales</strong>, ya que el resultado final depende íntegramente de la dedicación, estudio y desempeño individual del aspirante.
      </p>
    </>
  );
}