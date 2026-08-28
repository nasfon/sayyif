export type RoleName = 'super_admin' | 'shop_admin' | 'cashier'

export interface UserProfile {
  id: string
  shop_id: string | null
  role_id: string
  role: RoleName
  full_name: string
  email: string
  phone: string | null
  is_active: boolean
  last_login_at: string | null
  created_at: string
  updated_at: string
}

export function isRoleName(value: unknown): value is RoleName {
  return value === 'super_admin' || value === 'shop_admin' || value === 'cashier'
}