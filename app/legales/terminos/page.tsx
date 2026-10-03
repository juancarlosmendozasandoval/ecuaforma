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
        Estos Términos y Condiciones regulan el acceso y uso de la plataforma Ecuaforma (en adelante, la
        &quot;Plataforma&quot;), incluidos sus cursos en línea, clases en video, materiales descargables y simuladores
        de examen. Al registrarte, comprar o usar la Plataforma aceptas estos términos.
      </p>

      <h2>1. Quiénes somos</h2>
      <p>
        Ecuaforma es una plataforma educativa en línea orientada a la preparación para exámenes de admisión
        universitaria y para el ingreso a las Fuerzas Armadas y la Policía Nacional del Ecuador. Ecuaforma es un
        servicio de preparación independiente y no está afiliado, avalado ni patrocinado por ninguna universidad,
        institución militar o policial.
      </p>

      <h2>2. Cuenta de usuario</h2>
      <ul>
        <li>Para comprar o inscribirte en un curso necesitas una cuenta con datos verdaderos y actualizados.</li>
        <li>
          Tu cuenta es personal e intransferible. Eres responsable de la confidencialidad de tu acceso y de toda
          actividad realizada con ella.
        </li>
        <li>
          Si eres menor de 18 años, debes usar la Plataforma con el conocimiento y la autorización de tu madre,
          padre o representante legal, quien acepta estos términos en tu nombre.
        </li>
        <li>Puedes eliminar tu cuenta en cualquier momento desde tu perfil.</li>
      </ul>

      <h2>3. Contenidos y licencia de uso</h2>
      <p>
        Al inscribirte o comprar un curso o simulador, Ecuaforma te otorga una licencia limitada, personal, no
        exclusiva e intransferible para acceder a ese contenido con fines exclusivamente de estudio personal,
        durante el periodo de acceso indicado en la oferta.
      </p>
      <p>Queda prohibido, sin autorización escrita de Ecuaforma:</p>
      <ul>
        <li>Compartir tu cuenta o tus credenciales con terceros.</li>
        <li>Descargar, grabar, copiar, revender, publicar o distribuir videos, preguntas, soluciones o materiales.</li>
        <li>Usar herramientas automatizadas para extraer contenido de la Plataforma.</li>
        <li>Intentar eludir los controles de acceso o de pago.</li>
      </ul>
      <p>
        El incumplimiento de estas reglas puede dar lugar a la suspensión o cancelación de la cuenta sin derecho a
        reembolso, sin perjuicio de las acciones legales que correspondan.
      </p>

      <h2>4. Precios y pagos</h2>
      <ul>
        <li>Los precios se muestran en dólares de los Estados Unidos (USD) e incluyen los impuestos aplicables, salvo indicación contraria.</li>
        <li>
          Los pagos se procesan a través de pasarelas de terceros (por ejemplo, PayPhone o PayPal) o por
          transferencia bancaria. Ecuaforma no almacena los datos completos de tu tarjeta.
        </li>
        <li>El acceso al contenido se habilita una vez que la pasarela o Ecuaforma confirma el pago.</li>
        <li>Ecuaforma puede modificar sus precios en cualquier momento; el cambio no afecta a compras ya confirmadas.</li>
      </ul>

      <h2>5. Reembolsos</h2>
      <p>
        Las condiciones de devolución se detallan en nuestra{' '}
        <Link href="/legales/reembolsos">Política de Reembolsos</Link>, que forma parte de estos términos.
      </p>

      <h2>6. Resultados académicos</h2>
      <p>
        Los simuladores y cursos son herramientas de preparación. Ecuaforma no garantiza la aprobación de ningún
        examen, la obtención de un cupo ni un puntaje determinado, ya que estos dependen del esfuerzo de cada
        estudiante y de los criterios de cada institución. Los simuladores reproducen el formato aproximado de los
        exámenes reales y no son exámenes oficiales.
      </p>

      <h2>7. Certificados</h2>
      <p>
        Los certificados que emite Ecuaforma acreditan la culminación de un curso dentro de la Plataforma. No
        constituyen títulos académicos ni tienen validez oficial ante el sistema de educación superior.
      </p>

      <h2>8. Disponibilidad del servicio</h2>
      <p>
        Procuramos que la Plataforma esté disponible de forma continua, pero puede haber interrupciones por
        mantenimiento, fallas técnicas o causas ajenas a nuestro control. Podemos actualizar, reorganizar o
        mejorar los contenidos de los cursos sin reducir de forma sustancial lo ofrecido al momento de la compra.
      </p>

      <h2>9. Limitación de responsabilidad</h2>
      <p>
        En la máxima medida permitida por la ley, la responsabilidad de Ecuaforma frente a un usuario por cualquier
        reclamo relacionado con un curso o simulador se limita al valor efectivamente pagado por ese producto.
        Nada de lo dispuesto en estos términos limita los derechos irrenunciables que te reconoce la Ley Orgánica
        de Defensa del Consumidor.
      </p>

      <h2>10. Privacidad</h2>
      <p>
        El tratamiento de tus datos personales se rige por nuestra{' '}
        <Link href="/legales/privacidad">Política de Privacidad</Link>, conforme a la Ley Orgánica de Protección de
        Datos Personales del Ecuador.
      </p>

      <h2>11. Cambios en los términos</h2>
      <p>
        Podemos actualizar estos términos. Publicaremos la versión vigente en esta página con su fecha de
        actualización y, si el cambio es relevante, te lo comunicaremos por correo electrónico o dentro de la
        Plataforma.
      </p>

      <h2>12. Ley aplicable y contacto</h2>
      <p>
        Estos términos se rigen por las leyes de la República del Ecuador. Cualquier controversia se someterá a los
        jueces competentes del Ecuador, sin perjuicio de los mecanismos de reclamo previstos para consumidores.
      </p>
      <p>
        Para cualquier consulta escríbenos a <a href={`mailto:${CONTACTO_LEGAL.email}`}>{CONTACTO_LEGAL.email}</a> o
        al WhatsApp {CONTACTO_LEGAL.whatsapp}.
      </p>
    </>
  );
}
