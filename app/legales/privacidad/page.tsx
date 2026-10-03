import type { Metadata } from 'next';
import Link from 'next/link';
import { CONTACTO_LEGAL } from '@/lib/legales/documentos';

export const metadata: Metadata = {
  title: 'Política de Privacidad | Ecuaforma',
  description:
    'Cómo Ecuaforma recopila, usa y protege tus datos personales conforme a la Ley Orgánica de Protección de Datos Personales del Ecuador.',
  alternates: { canonical: '/legales/privacidad' },
};

export default function PrivacidadPage() {
  return (
    <>
      <h1>Política de Privacidad</h1>
      <p className="lead">
        En Ecuaforma respetamos tu privacidad. Esta política explica qué datos personales tratamos, con qué
        finalidad y cómo puedes ejercer tus derechos, de acuerdo con la Ley Orgánica de Protección de Datos
        Personales del Ecuador (LOPDP) y su reglamento.
      </p>

      <h2>1. Responsable del tratamiento</h2>
      <p>
        El responsable del tratamiento de tus datos es Ecuaforma. Puedes contactarnos para cualquier asunto
        relacionado con tus datos en <a href={`mailto:${CONTACTO_LEGAL.email}`}>{CONTACTO_LEGAL.email}</a>.
      </p>

      <h2>2. Datos que recopilamos</h2>
      <ul>
        <li>
          <strong>Datos de cuenta:</strong> nombre, correo electrónico y foto de perfil que nos facilita tu proveedor
          de inicio de sesión (por ejemplo, Google).
        </li>
        <li>
          <strong>Datos académicos:</strong> cursos inscritos, lecciones completadas, intentos y puntajes en los
          simuladores, y certificados emitidos.
        </li>
        <li>
          <strong>Datos de pago:</strong> producto comprado, monto, fecha y estado de la transacción, e
          identificadores que nos devuelve la pasarela. Los datos de tu tarjeta los procesa directamente la
          pasarela de pago (PayPhone o PayPal); Ecuaforma no los almacena.
        </li>
        <li>
          <strong>Datos técnicos:</strong> cookies necesarias para mantener tu sesión iniciada, y registros técnicos
          básicos (como dirección IP y navegador) para la seguridad del servicio.
        </li>
      </ul>

      <h2>3. Finalidades y base legal</h2>
      <ul>
        <li>
          <strong>Prestar el servicio</strong> (crear tu cuenta, darte acceso a los cursos, guardar tu progreso y emitir
          certificados): ejecución del contrato que aceptas al registrarte o comprar.
        </li>
        <li>
          <strong>Procesar pagos y cumplir obligaciones tributarias y contables:</strong> obligación legal.
        </li>
        <li>
          <strong>Enviarte comunicaciones del servicio</strong> (confirmaciones de compra, bienvenida, avisos
          importantes): ejecución del contrato.
        </li>
        <li>
          <strong>Mejorar la Plataforma</strong> mediante estadísticas agregadas y anónimas: interés legítimo.
        </li>
        <li>
          <strong>Enviarte promociones:</strong> solo con tu consentimiento, que puedes retirar en cualquier momento.
        </li>
      </ul>

      <h2>4. Con quién compartimos tus datos</h2>
      <p>No vendemos tus datos personales. Solo los compartimos con proveedores que nos ayudan a prestar el servicio:</p>
      <ul>
        <li>Supabase: alojamiento de la base de datos y autenticación.</li>
        <li>PayPhone y PayPal: procesamiento de pagos.</li>
        <li>Proveedores de correo electrónico transaccional y de alojamiento web.</li>
      </ul>
      <p>
        Algunos de estos proveedores pueden almacenar datos fuera del Ecuador. En esos casos exigimos garantías
        adecuadas de protección, conforme a la LOPDP. También podemos comunicar datos a autoridades cuando una ley
        o una orden judicial lo exija.
      </p>

      <h2>5. Conservación</h2>
      <p>
        Conservamos tus datos mientras tu cuenta esté activa. Si eliminas tu cuenta, borramos tu identidad, tus
        accesos, tu progreso y tus resultados. Los registros de pago se conservan desvinculados de tu identidad
        durante el plazo que exige la normativa tributaria y contable.
      </p>

      <h2>6. Tus derechos</h2>
      <p>De acuerdo con la LOPDP, tienes derecho a:</p>
      <ul>
        <li><strong>Acceso:</strong> saber qué datos tuyos tratamos.</li>
        <li><strong>Rectificación y actualización:</strong> corregir datos inexactos (puedes cambiar tu nombre en tu perfil).</li>
        <li>
          <strong>Eliminación:</strong> pedir que borremos tus datos. Puedes hacerlo tú mismo con la opción
          &quot;Eliminar mi cuenta definitivamente&quot; de tu <Link href="/perfil">perfil</Link>.
        </li>
        <li><strong>Oposición y suspensión del tratamiento</strong> en los casos previstos por la ley.</li>
        <li><strong>Portabilidad:</strong> recibir tus datos en un formato estructurado.</li>
        <li><strong>Revocar tu consentimiento</strong> para las finalidades que se basen en él.</li>
      </ul>
      <p>
        Para ejercer estos derechos escríbenos a <a href={`mailto:${CONTACTO_LEGAL.email}`}>{CONTACTO_LEGAL.email}</a>.
        Responderemos dentro de los plazos que establece la ley. Si consideras que no atendimos tu solicitud, puedes
        presentar un reclamo ante la Superintendencia de Protección de Datos Personales.
      </p>

      <h2>7. Seguridad</h2>
      <p>
        Aplicamos medidas técnicas y organizativas razonables para proteger tus datos: conexiones cifradas (HTTPS),
        control de acceso por usuario en la base de datos y acceso restringido a la información administrativa.
        Si ocurriera una vulneración de seguridad que afecte tus datos, te lo notificaremos conforme a la ley.
      </p>

      <h2>8. Menores de edad</h2>
      <p>
        Si eres menor de 18 años, debes contar con la autorización de tu madre, padre o representante legal para
        usar la Plataforma. Si un representante legal considera que tratamos datos de un menor sin autorización,
        puede escribirnos para eliminarlos.
      </p>

      <h2>9. Cookies</h2>
      <p>
        Usamos cookies técnicas imprescindibles para mantener tu sesión iniciada y recordar a dónde volver tras el
        inicio de sesión. Las pasarelas de pago pueden usar sus propias cookies durante el proceso de compra.
      </p>

      <h2>10. Cambios en esta política</h2>
      <p>
        Publicaremos cualquier cambio en esta página, con su fecha de actualización. Si el cambio es relevante, te
        lo comunicaremos por correo electrónico o dentro de la Plataforma.
      </p>
    </>
  );
}
