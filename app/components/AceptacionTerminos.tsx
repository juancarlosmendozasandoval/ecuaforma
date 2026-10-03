'use client';

/** Casilla obligatoria antes de pagar o inscribirse. Los enlaces abren en otra pestaña para no perder el checkout. */
export default function AceptacionTerminos({
  aceptado,
  onChange,
  id = 'aceptar-terminos',
}: {
  aceptado: boolean;
  onChange: (valor: boolean) => void;
  id?: string;
}) {
  const enlace = 'font-semibold text-primary underline underline-offset-2 hover:text-blue-800';

  return (
    <label
      htmlFor={id}
      className={`flex items-start gap-3 rounded-xl border p-3 text-sm leading-snug cursor-pointer transition-colors ${
        aceptado ? 'border-blue-200 bg-blue-50/60 text-gray-700' : 'border-gray-200 bg-gray-50 text-gray-600'
      }`}
    >
      <input
        id={id}
        type="checkbox"
        required
        checked={aceptado}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-gray-300 accent-primary"
      />
      <span>
        He leído y acepto los{' '}
        <a href="/legales/terminos" target="_blank" rel="noopener noreferrer" className={enlace}>
          Términos y Condiciones
        </a>{' '}
        y las{' '}
        <a href="/legales/reembolsos" target="_blank" rel="noopener noreferrer" className={enlace}>
          Políticas de Reembolso
        </a>
        .
      </span>
    </label>
  );
}
