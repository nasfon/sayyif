export interface ProductRecord {
  id: string
  shop_id: string
  name: string
  sku: string
  quantity: number
  selling_price: number
  minimum_stock: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export type ProductStatusFilter = 'active' | 'inactive' | ''

export interface ProductListParams {
  page: number
  pageSize: number
  search?: string
  status?: ProductStatusFilter
  shopId?: string
}

export interface ProductListResult {
  rows: ProductRecord[]
  count: number
}

export interface CreateProductInput {
  shop_id: string
  name: string
  sku: string
  quantity: number
  selling_price: number
  minimum_stock: number
}

export interface UpdateProductInput {
  product_id: string
  name: string
  sku: string
  quantity: number
  selling_price: number
  minimum_stock: number
  is_active: boolean
}