const ENLACE_CURSOS = 'https://ecuaforma.com/mis-cursos';

function escaparHtml(valor: string) {
  return valor
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Correo de bienvenida. El encabezado usa los colores de la marca porque
 * no hay un archivo de logo en `public/` y el SVG no se ve en la mayoría
 * de clientes de correo.
 */
export function plantillaBienvenida(nombreCurso: string) {
  const curso = escaparHtml(nombreCurso.trim() || 'tu curso');

  return `<!DOCTYPE html>
<html lang="es">
  <body style="margin:0;padding:0;background:#F5F7FA;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F5F7FA;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;">
            <tr>
              <td style="background:#0D47A1;padding:28px 32px;">
                <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:700;letter-spacing:2px;color:#FFC107;">ECUAFORMA</p>
                <p style="margin:8px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:22px;font-weight:800;color:#ffffff;">Tu preparación ya está activa</p>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;font-family:Arial,Helvetica,sans-serif;color:#212121;font-size:16px;line-height:1.6;">
                <p style="margin:0 0 16px;">¡Bienvenido a Ecuaforma! Se ha activado tu acceso al curso: <strong>${curso}</strong>. Ya puedes iniciar sesión para empezar tu preparación.</p>
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
                  <tr>
                    <td style="background:#1976D2;border-radius:10px;">
                      <a href="${ENLACE_CURSOS}" style="display:inline-block;padding:14px 24px;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;">Ir a mis cursos</a>
                    </td>
                  </tr>
                </table>
                <p style="margin:0;font-size:13px;color:#757575;">Si el botón no abre, copia este enlace:<br /><a href="${ENLACE_CURSOS}" style="color:#0D47A1;">${ENLACE_CURSOS}</a></p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
