import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const AuthContext = createContext(null)
const AUTH_TIMEOUT_MS = 6000

function withTimeout(promise, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      window.setTimeout(() => reject(new Error(`${label} timeout`)), AUTH_TIMEOUT_MS)
    }),
  ])
}

async function loadProfile(userId) {
  const [{ data: profile, error: profileError }, { data: vetProfile, error: vetProfileError }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
    supabase.from('vet_profiles').select('*').eq('id', userId).maybeSingle(),
  ])

  if (profileError) throw profileError
  if (vetProfileError) throw vetProfileError

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

    function clearAuthState() {
      setSession(null)
      setProfile(null)
      setVetProfile(null)
      setRole('owner')
    }

    async function applySession(nextSession) {
      if (!active) return
      setSession(nextSession)
      setProfile(null)
      setVetProfile(null)
      setRole('owner')

      if (!nextSession?.user) {
        return
      }

      try {
        const loaded = await withTimeout(loadProfile(nextSession.user.id), 'profile load')
        if (!active) return
        setProfile(loaded.profile)
        setVetProfile(loaded.vetProfile)
        setRole(loaded.role)
      } catch (error) {
        console.warn('Supabase profile load error:', error)
        if (!active) return
        setProfile(null)
        setVetProfile(null)
        setRole('owner')
      }
    }

    async function init() {
      try {
        const { data, error } = await withTimeout(supabase.auth.getSession(), 'session init')
        if (error) throw error
        await applySession(data.session)
      } catch (error) {
        console.warn('Supabase session init error:', error)
        if (!active) return
        clearAuthState()
        await supabase.auth.signOut({ scope: 'local' }).catch((signOutError) => {
          console.warn('Supabase local sign out error:', signOutError)
        })
      } finally {
        if (active) setLoading(false)
      }
    }

    init()

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      window.setTimeout(() => {
        applySession(nextSession)
          .catch((error) => {
            console.warn('Supabase auth state error:', error)
          })
          .finally(() => {
            if (active) setLoading(false)
          })
      }, 0)
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
    signOut: async () => {
      const { error } = await supabase.auth.signOut({ scope: 'local' })
      setSession(null)
      setProfile(null)
      setVetProfile(null)
      setRole('owner')
      if (error) throw error
    },
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
