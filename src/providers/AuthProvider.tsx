import { useEffect, useState, type ReactNode } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { Session } from '@supabase/auth-js'
import { AuthContext } from '../hooks/useAuth'
import { getCurrentUserProfile, getSession, onAuthStateChange, signInWithPassword, signOut } from '../services/auth'

function useProfileQuery(userId: string | null) {
  return useQuery({
    queryKey: ['auth', 'profile', userId],
    queryFn: () => getCurrentUserProfile(userId as string),
    enabled: !!userId,
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
  })
}

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [initializing, setInitializing] = useState(true)
  const queryClient = useQueryClient()

  useEffect(() => {
    let active = true

    getSession().then((current) => {
      if (active) {
        setSession(current)
        setInitializing(false)
      }
    })

    const { data } = onAuthStateChange((next) => {
      setSession(next)
    })

    return () => {
      active = false
      data.subscription.unsubscribe()
    }
  }, [])

  const userId = session?.user.id ?? null
  const profileQuery = useProfileQuery(userId)

  const login = (email: string, password: string) => signInWithPassword(email, password)
  const logout = () => signOut()

  const retryProfile = async () => {
    if (!userId) return
    await queryClient.refetchQueries({ queryKey: ['auth', 'profile', userId] })
  }

  const value = {
    session,
    user: session?.user ?? null,
    profile: profileQuery.data ?? null,
    isProfileLoading: profileQuery.isLoading,
    profileError: profileQuery.error ?? null,
    initializing,
    login,
    logout,
    retryProfile,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}