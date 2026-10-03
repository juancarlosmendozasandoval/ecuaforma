import type { Metadata } from 'next';
import Link from 'next/link';
import { CONTACTO_LEGAL } from '@/lib/legales/documentos';

export const metadata: Metadata = {
  title: 'Términos y Condiciones | Ecuaforma',
  description: 'Condiciones de uso de la plataforma Ecuaforma, sus cursos en línea y simuladores de examen.',
  alternates: { canonical: '/legales/terminos' },
};

export default function TerminosPage() {
  return (
    <>
      <h1>Términos y Condiciones</h1>
      <p className="lead">
        Estos Términos y Condiciones regulan el acceso y uso de la plataforma Ecuaforma (en adelante, la &quot;Plataforma&quot;). Al registrarte, comprar o usar nuestros simuladores y cursos, aceptas legalmente estos términos.
      </p>

      <h2>1. Naturaleza del Servicio</h2>
      <p>
        Ecuaforma es una plataforma educativa privada de preparación para exámenes de ingreso. <strong>Ecuaforma NO está afiliada, avalada, auspiciada ni relacionada de ninguna forma con las Fuerzas Armadas del Ecuador, la Policía Nacional del Ecuador, ni instituciones gubernamentales o universitarias.</strong>
      </p>

      <h2>2. Uso de la Cuenta y Prohibiciones</h2>
      <p>Al adquirir un curso, se te otorga una licencia personal, individual e intransferible. Queda estrictamente prohibido:</p>
      <ul>
        <li><strong>Compartir tu cuenta:</strong> Tus credenciales de acceso son de uso exclusivo. Nuestro sistema detecta automáticamente conexiones simultáneas o uso desde múltiples dispositivos sospechosos.</li>
        <li><strong>Piratería:</strong> Copiar, descargar, grabar en pantalla, revender o distribuir nuestros simuladores, preguntas o material intelectual.</li>
        <li><strong>Automatización:</strong> Usar bots, scripts o herramientas para extraer masivamente el contenido de nuestra base de datos.</li>
      </ul>
      <p>
        El incumplimiento de cualquiera de estas normas resultará en la <strong>suspensión inmediata y definitiva de tu cuenta</strong> sin derecho a reclamo ni reembolso, y nos reservamos el derecho de iniciar acciones legales por violación a la propiedad intelectual.
      </p>

      <h2>3. Pagos y Accesos</h2>
      <p>
        Los pagos son procesados de forma segura por terceros (PayPhone, PayPal). El acceso al contenido se libera automáticamente al confirmar la transacción. Cualquier intento de fraude, contracargo injustificado o manipulación de pagos resultará en el bloqueo de la cuenta y el reporte a las autoridades correspondientes.
      </p>

      <h2>4. Limitación de Responsabilidad</h2>
      <p>
        Los simuladores de Ecuaforma están diseñados para recrear las condiciones de los exámenes reales y medir el conocimiento del aspirante. Sin embargo, no garantizamos que las preguntas de nuestra plataforma sean idénticas a las de los exámenes oficiales. La responsabilidad de aprobar el proceso de admisión recae exclusivamente en el estudiante.
      </p>

      <h2>5. Modificaciones</h2>
      <p>
        Ecuaforma se reserva el derecho de modificar estos términos, así como de actualizar, agregar o retirar material de estudio de la plataforma para mantener el contenido vigente según los temarios oficiales, sin previo aviso.
      </p>
    </>
  );
}