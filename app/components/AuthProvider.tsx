'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Session, SupabaseClient, User, AuthChangeEvent } from '@supabase/supabase-js'

type SupabaseContext = {
  supabase: SupabaseClient
  /** Sesión del navegador: solo para estado visual, nunca para autorizar. */
  session: Session | null
  user: User | null
  signOut: () => Promise<void>
}

const Context = createContext<SupabaseContext | undefined>(undefined)

/**
 * `initialUser` llega del layout, validado con `getUser()` en el servidor,
 * para que el primer render no parpadee. Después, el estado sigue a
 * `onAuthStateChange` (login, logout y refresco de token en el navegador).
 * La autorización real vive en el servidor (páginas, acciones y RLS).
 */
export default function AuthProvider({
  children,
  initialUser,
}: {
  children: React.ReactNode
  initialUser: User | null
}) {
  const [supabase] = useState(() => createClient())
  const [user, setUser] = useState<User | null>(initialUser)
  const [session, setSession] = useState<Session | null>(null)

  const signOut = async () => {
    await supabase.auth.signOut()
    setSession(null)
    setUser(null)
  }

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, nuevaSesion: Session | null) => {
      if (event === 'SIGNED_OUT') {
        setSession(null)
        setUser(null)
        return
      }
      setSession(nuevaSesion)
      setUser(nuevaSesion?.user ?? null)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase])

  return (
    <Context.Provider value={{ supabase, session, user, signOut }}>
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
