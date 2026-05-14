import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const AuthContext = createContext(null)

async function loadProfile(userId) {
  const [{ data: profile }, { data: vetProfile }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
    supabase.from('vet_profiles').select('*').eq('id', userId).maybeSingle(),
  ])

  return {
    profile,
    vetProfile,
    role: vetProfile ? 'vet' : profile?.role || 'owner',
  }
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [vetProfile, setVetProfile] = useState(null)
  const [role, setRole] = useState('owner')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    async function init() {
      const { data } = await supabase.auth.getSession()
      if (!active) return
      setSession(data.session)

      if (data.session?.user) {
        const loaded = await loadProfile(data.session.user.id)
        if (!active) return
        setProfile(loaded.profile)
        setVetProfile(loaded.vetProfile)
        setRole(loaded.role)
      }

      setLoading(false)
    }

    init()

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      setSession(nextSession)
      if (nextSession?.user) {
        const loaded = await loadProfile(nextSession.user.id)
        setProfile(loaded.profile)
        setVetProfile(loaded.vetProfile)
        setRole(loaded.role)
      } else {
        setProfile(null)
        setVetProfile(null)
        setRole('owner')
      }
      setLoading(false)
    })

    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [])

  const value = useMemo(() => ({
    user: session?.user || null,
    session,
    profile,
    vetProfile,
    role,
    loading,
    isOwner: role === 'owner',
    isVet: role === 'vet',
    signOut: () => supabase.auth.signOut(),
    deleteAccount: async () => {
      const { error } = await supabase.rpc('delete_current_user')
      if (error) throw error
      await supabase.auth.signOut()
    },
  }), [session, profile, vetProfile, role, loading])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return context
}
