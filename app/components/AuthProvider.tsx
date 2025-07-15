'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
// Importamos los tipos necesarios
import type { Session, SupabaseClient, User, AuthChangeEvent } from '@supabase/supabase-js'

type SupabaseContext = {
  supabase: SupabaseClient
  session: Session | null
  user: User | null
  signOut: () => Promise<void>
}

const Context = createContext<SupabaseContext | undefined>(undefined)

export default function AuthProvider({
  children,
  session,
}: {
  children: React.ReactNode
  session: Session | null
}) {
  const supabase = createClient()
  const [userSession, setUserSession] = useState<Session | null>(session)
  const user = userSession?.user ?? null

  const signOut = async () => {
    await supabase.auth.signOut()
    setUserSession(null) // Forzamos el estado a null al cerrar sesión
  }

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => { // <-- TIPOS AÑADIDOS
      if (event === 'SIGNED_IN') {
        setUserSession(session)
      }
      if (event === 'SIGNED_OUT') {
        setUserSession(null)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase])

  return (
    <Context.Provider value={{ supabase, session: userSession, user, signOut }}>
      <>{children}</>
    </Context.Provider>
  )
}

export const useSupabase = () => {
  const context = useContext(Context)
  if (context === undefined) {
    throw new Error('useSupabase must be used inside AuthProvider')
  }
  return context
}
