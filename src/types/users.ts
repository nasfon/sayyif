import type { RoleName } from './auth'

export interface UserRecord {
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

export interface UserListParams {
  page: number
  pageSize: number
  search?: string
  role?: RoleName | ''
}

export interface UserListResult {
  rows: UserRecord[]
  count: number
}

export interface CreateUserInput {
  email: string
  password: string
  full_name: string
  phone?: string
  role: RoleName
  shop_id: string | null
}

export interface OnboardUserInput {
  user_id: string
  full_name: string
  phone?: string
  role: RoleName
  shop_id: string | null
}

export interface UpdateUserInput {
  user_id: string
  full_name: string
  phone?: string
  role: RoleName
  shop_id: string | null
  is_active: boolean
}

export interface UnassignedAuthUser {
  id: string
  email: string
  created_at: string
}

export interface RoleOption {
  id: string
  name: RoleName
  description: string | null
}

export interface ShopOption {
  id: string
  name: string
}