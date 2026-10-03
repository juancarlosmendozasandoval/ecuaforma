import type { Metadata } from 'next';
import Link from 'next/link';
import { CONTACTO_LEGAL } from '@/lib/legales/documentos';

export const metadata: Metadata = {
  title: 'Política de Privacidad | Ecuaforma',
  description: 'Cómo Ecuaforma recopila, usa y protege tus datos personales conforme a la Ley Orgánica de Protección de Datos Personales del Ecuador.',
  alternates: { canonical: '/legales/privacidad' },
};

export default function PrivacidadPage() {
  return (
    <>
      <h1>Política de Privacidad</h1>
      <p className="lead">
        En Ecuaforma protegemos tu información personal y cumplimos estrictamente con la Ley Orgánica de Protección de Datos Personales del Ecuador (LOPDP).
      </p>

      <h2>1. Datos Financieros y Tarjetas de Crédito</h2>
      <p>
        <strong>Ecuaforma NO recopila, no procesa y no almacena números de tarjetas de crédito o débito, ni códigos de seguridad (CVV).</strong> Todos los pagos realizados en nuestra plataforma son encriptados y procesados directamente en los servidores de alta seguridad de nuestras pasarelas asociadas (PayPhone y PayPal), las cuales cumplen con los estándares internacionales PCI-DSS. Nosotros únicamente recibimos un identificador de confirmación de pago para habilitar tu acceso.
      </p>

      <h2>2. Datos que sí recopilamos</h2>
      <ul>
        <li><strong>Información de Perfil:</strong> Nombre, correo electrónico y foto (proporcionados por Google al iniciar sesión).</li>
        <li><strong>Datos de Rendimiento:</strong> Resultados de tus simuladores, tiempo de resolución, intentos y lecciones completadas para poder mostrarte tus estadísticas de progreso.</li>
        <li><strong>Datos Técnicos:</strong> Dirección IP y registros de sesión con la finalidad exclusiva de detectar fraudes o cuentas compartidas de forma ilegal.</li>
      </ul>

      <h2>3. Uso de la Información</h2>
      <p>Tus datos son utilizados exclusivamente para:</p>
      <ul>
        <li>Crear tu perfil y otorgarte acceso al material de estudio adquirido.</li>
        <li>Generar reportes personalizados de tu rendimiento académico en los simuladores.</li>
        <li>Enviarte correos relacionados con soporte técnico, recibos de compra o actualizaciones críticas del temario.</li>
      </ul>
      <p><strong>Bajo ninguna circunstancia vendemos, alquilamos o comercializamos tus datos personales a terceros.</strong></p>

      <h2>4. Tus Derechos (Derecho al Olvido)</h2>
      <p>
        Tienes derecho a acceder, rectificar o eliminar tus datos en cualquier momento. Si deseas borrar tu rastro digital de nuestra plataforma, puedes hacerlo tú mismo dirigiéndote a la sección de tu <Link href="/perfil">Perfil</Link> y utilizando la opción <strong>&quot;Eliminar mi cuenta definitivamente&quot;</strong>. Esta acción destruirá tus credenciales y tu historial de progreso de nuestra base de datos.
      </p>

      <h2>5. Contacto</h2>
      <p>
        Si tienes preguntas sobre el manejo de tus datos, puedes comunicarte con nuestro equipo legal y de soporte técnico escribiendo a <a href={`mailto:${CONTACTO_LEGAL.email}`}>{CONTACTO_LEGAL.email}</a>.
      </p>
    </>
  );
}