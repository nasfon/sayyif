export interface ShopRecord {
  id: string
  name: string
  phone: string | null
  email: string | null
  address: string | null
  logo_url: string | null
  receipt_footer: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export type ShopStatusFilter = 'active' | 'inactive' | ''

export interface ShopListParams {
  page: number
  pageSize: number
  search?: string
  status?: ShopStatusFilter
}

export interface ShopListResult {
  rows: ShopRecord[]
  count: number
}

export interface CreateShopInput {
  name: string
  phone?: string
  email?: string
  address?: string
  logo_url?: string
  receipt_footer?: string
}

export interface UpdateShopInput {
  shop_id: string
  name: string
  phone?: string
  email?: string
  address?: string
  logo_url?: string
  receipt_footer?: string
  is_active: boolean
}