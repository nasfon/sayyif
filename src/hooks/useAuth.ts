import { createContext, useContext } from 'react'
import type { Session, User } from '@supabase/auth-js'
import type { UserProfile } from '../types/auth'

export interface AuthContextValue {
  session: Session | null
  user: User | null
  profile: UserProfile | null
  isProfileLoading: boolean
  profileError: Error | null
  initializing: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  retryProfile: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}