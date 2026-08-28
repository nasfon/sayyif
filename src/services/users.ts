import { supabase } from '../lib/supabase'
import { isRoleName } from '../types/auth'
import type {
  CreateUserInput,
  OnboardUserInput,
  UnassignedAuthUser,
  UpdateUserInput,
  UserListParams,
  UserListResult,
  UserRecord,
} from '../types/users'

export interface UserRecordRow {
  id: string
  shop_id: string | null
  role_id: string
  role: { name: string } | null
  full_name: string
  email: string
  phone: string | null
  is_active: boolean
  last_login_at: string | null
  created_at: string
  updated_at: string
}

export function mapUserRecordRow(row: UserRecordRow): UserRecord | null {
  if (!isRoleName(row.role?.name)) return null
  return {
    id: row.id,
    shop_id: row.shop_id,
    role_id: row.role_id,
    role: row.role.name,
    full_name: row.full_name,
    email: row.email,
    phone: row.phone,
    is_active: row.is_active,
    last_login_at: row.last_login_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

const userSelect = 'id, shop_id, role_id, role:roles(name), full_name, email, phone, is_active, last_login_at, created_at, updated_at'

export async function listUsers(params: UserListParams): Promise<UserListResult> {
  const { page, pageSize, search, role } = params
  const from = page * pageSize
  const to = from + pageSize - 1

  let query = supabase
    .from('users')
    .select(userSelect, { count: 'exact' })
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .range(from, to)

  if (search) {
    query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`)
  }
  if (role) {
    query = query.eq('roles.name', role)
  }

  const { data, error, count } = await query
  if (error) throw error

  const rows = (data as unknown as UserRecordRow[])
    .map(mapUserRecordRow)
    .filter((row): row is UserRecord => row !== null)

  return { rows, count: count ?? rows.length }
}

export async function createUser(input: CreateUserInput): Promise<void> {
  await supabase.functions.invoke('admin-create-user', {
    email: input.email,
    password: input.password,
    full_name: input.full_name,
    phone: input.phone ?? null,
    role_name: input.role,
    shop_id: input.shop_id,
  })
}

export async function onboardUser(input: OnboardUserInput): Promise<void> {
  const { error } = await supabase.rpc('admin_onboard_user', {
    p_user_id: input.user_id,
    p_full_name: input.full_name,
    p_phone: input.phone ?? null,
    p_role_name: input.role,
    p_shop_id: input.shop_id,
  })
  if (error) throw error
}

export async function updateUser(input: UpdateUserInput): Promise<void> {
  const { error } = await supabase.rpc('admin_update_user', {
    p_user_id: input.user_id,
    p_full_name: input.full_name,
    p_phone: input.phone ?? null,
    p_role_name: input.role,
    p_shop_id: input.shop_id,
    p_is_active: input.is_active,
  })
  if (error) throw error
}

export async function resetPassword(userId: string, newPassword: string): Promise<void> {
  await supabase.functions.invoke('admin-reset-password', {
    user_id: userId,
    new_password: newPassword,
  })
}

export async function deleteUser(userId: string): Promise<void> {
  const { error } = await supabase.rpc('admin_delete_user', { p_user_id: userId })
  if (error) throw error
}

export async function listUnassignedAuthUsers(): Promise<UnassignedAuthUser[]> {
  const { data, error } = await supabase.rpc('admin_list_unassigned_auth_users')
  if (error) throw error
  return (data ?? []) as UnassignedAuthUser[]
}

export async function listUserOptions(shopId?: string): Promise<{ id: string; full_name: string }[]> {
  let query = supabase
    .from('users')
    .select('id, full_name')
    .is('deleted_at', null)
    .order('full_name')

  if (shopId) {
    query = query.eq('shop_id', shopId)
  }

  const { data, error } = await query
  if (error) throw error
  return (data ?? []).map((row) => ({
    id: row.id as string,
    full_name: row.full_name as string,
  }))
}