import type { Session } from '@supabase/auth-js'
import { supabase } from '../lib/supabase'
import type { UserProfile } from '../types/auth'
import { mapUserRecordRow, type UserRecordRow } from './users'

export async function getSession() {
  const { data } = await supabase.auth.getSession()
  return data.session
}

export function onAuthStateChange(callback: (session: Session | null) => void) {
  return supabase.auth.onAuthStateChange((_event, session) => {
    callback(session)
  })
}

export async function signInWithPassword(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function getCurrentUserProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('users')
    .select(
      'id, shop_id, role_id, role:roles(name), full_name, email, phone, is_active, last_login_at, created_at, updated_at',
    )
    .eq('id', userId)
    .is('deleted_at', null)
    .eq('is_active', true)
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  return mapUserRecordRow(data as unknown as UserRecordRow)
}