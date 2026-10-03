import { esAdmin } from '@/lib/auth/adminEmail';
import { requireAuth } from '@/lib/auth/requireAuth';
import PerfilCliente from './PerfilCliente';

export const dynamic = 'force-dynamic';

export default async function PerfilPage() {
  const { user } = await requireAuth();
  const metadata = (user.user_metadata || {}) as Record<string, unknown>;

  const usuario = {
    email: user.email || '',
    full_name: typeof metadata.full_name === 'string' ? metadata.full_name : '',
    esAdmin: esAdmin(user.email),
  };

  return <PerfilCliente user={usuario} />;
}
