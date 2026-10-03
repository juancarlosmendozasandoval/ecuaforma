'use client';

import { useState } from 'react';
import AceptacionTerminos from './AceptacionTerminos';
import BotonInscripcionGratis from './BotonInscripcionGratis';
import BotonPayPhone from './BotonPayPhone';

/** Pago con PayPhone o inscripción gratis, ambos bloqueados hasta aceptar los términos. */
export default function CajaCompraCurso({
  cursoId,
  precio,
  esPago,
}: {
  cursoId: string;
  precio: number;
  esPago: boolean;
}) {
  const [aceptado, setAceptado] = useState(false);

  return (
    <div className="space-y-3">
      <AceptacionTerminos aceptado={aceptado} onChange={setAceptado} id={`aceptar-terminos-${cursoId}`} />
      {esPago ? (
        <BotonPayPhone cursoId={cursoId} precio={precio} disabled={!aceptado} />
      ) : (
        <BotonInscripcionGratis cursoId={cursoId} disabled={!aceptado} />
      )}
    </div>
  );
}
