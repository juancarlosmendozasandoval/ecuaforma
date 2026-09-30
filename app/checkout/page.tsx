import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import CheckoutCliente from './CheckoutCliente';

export const dynamic = 'force-dynamic';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type SearchParams = { [key: string]: string | string[] | undefined };
const param = (sp: SearchParams, key: string) => {
  const v = sp[key];
  return (Array.isArray(v) ? v[0] : v) || '';
};

/**
 * Checkout. Con `?curso=<uuid>` el nombre y el precio salen de la base de datos
 * y se habilitan PayPhone y PayPal. Los enlaces antiguos (`?nombre=&precio=`)
 * solo muestran transferencia.
 */
export default async function CheckoutPage({ searchParams }: { searchParams: SearchParams }) {
  const cursoParam = param(searchParams, 'curso');
  const cancelado = param(searchParams, 'cancelado') === '1';

  if (UUID_REGEX.test(cursoParam)) {
    const cookieStore = cookies();
    const supabase = createServerComponentClient({ cookies: () => cookieStore });
    const { data: curso } = await supabase
      .from('cursos')
      .select('id, nombre, institucion, precio, es_pago, is_deleted')
      .eq('id', cursoParam)
      .maybeSingle();

    if (!curso || curso.is_deleted || !curso.es_pago || !(Number(curso.precio) > 0)) {
      return <div className="p-10 text-center">Este curso no está disponible para compra.</div>;
    }

    return (
      <CheckoutCliente
        cursoId={curso.id}
        nombreItem={curso.nombre || 'Curso Ecuaforma'}
        precio={Number(curso.precio).toFixed(2)}
        institucion={curso.institucion || ''}
        cancelado={cancelado}
      />
    );
  }

  return (
    <CheckoutCliente
      cursoId={null}
      nombreItem={param(searchParams, 'nombre') || 'Acceso Premium a Ecuaforma'}
      precio={param(searchParams, 'precio') || '50.00'}
      institucion={param(searchParams, 'institucion')}
      cancelado={false}
    />
  );
}
