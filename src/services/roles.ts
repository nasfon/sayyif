import { supabase } from '../lib/supabase'
import { isRoleName, type RoleName } from '../types/auth'
import type { RoleOption } from '../types/users'

interface RoleRow {
  id: string
  name: string
  description: string | null
}

export async function listRoles(): Promise<RoleOption[]> {
  const { data, error } = await supabase
    .from('roles')
    .select('id, name, description')
    .order('name')

  if (error) throw error

  return (data as unknown as RoleRow[])
    .filter((row): row is RoleRow & { name: RoleName } => isRoleName(row.name))
    .map((row) => ({ id: row.id, name: row.name, description: row.description }))
}