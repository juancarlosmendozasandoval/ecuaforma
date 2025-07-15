// **NOTA**: Este archivo reemplaza al antiguo `lib/supabaseClient.ts`
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

// La función correcta es createClientComponentClient para componentes de cliente.
export const createClient = () => createClientComponentClient(
  {
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  }
)