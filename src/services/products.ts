import { supabase } from '../lib/supabase'
import type {
  CreateProductInput,
  ProductListParams,
  ProductListResult,
  ProductRecord,
  UpdateProductInput,
} from '../types/products'

const productSelect =
  'id, shop_id, name, sku, quantity, selling_price, minimum_stock, is_active, created_at, updated_at'

function mapProductRow(row: Record<string, unknown>): ProductRecord {
  return {
    id: row.id as string,
    shop_id: row.shop_id as string,
    name: row.name as string,
    sku: row.sku as string,
    quantity: Number(row.quantity),
    selling_price: Number(row.selling_price),
    minimum_stock: Number(row.minimum_stock),
    is_active: row.is_active as boolean,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  }
}

export async function listProducts(params: ProductListParams): Promise<ProductListResult> {
  const { page, pageSize, search, status, shopId } = params
  const from = page * pageSize
  const to = from + pageSize - 1

  let query = supabase
    .from('products')
    .select(productSelect, { count: 'exact' })
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .range(from, to)

  if (shopId) {
    query = query.eq('shop_id', shopId)
  }
  if (search) {
    query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%`)
  }
  if (status === 'active') {
    query = query.eq('is_active', true)
  } else if (status === 'inactive') {
    query = query.eq('is_active', false)
  }

  const { data, error, count } = await query
  if (error) throw error

  const rows = (data ?? []).map((row) => mapProductRow(row as Record<string, unknown>))
  return { rows, count: count ?? rows.length }
}

export async function createProduct(input: CreateProductInput): Promise<void> {
  const { error } = await supabase.from('products').insert({
    shop_id: input.shop_id,
    name: input.name,
    sku: input.sku,
    quantity: input.quantity,
    selling_price: input.selling_price,
    minimum_stock: input.minimum_stock,
  })
  if (error) throw error
}

export async function updateProduct(input: UpdateProductInput): Promise<void> {
  const { error } = await supabase
    .from('products')
    .update({
      name: input.name,
      sku: input.sku,
      quantity: input.quantity,
      selling_price: input.selling_price,
      minimum_stock: input.minimum_stock,
      is_active: input.is_active,
    })
    .eq('id', input.product_id)
  if (error) throw error
}

export async function softDeleteProduct(productId: string): Promise<void> {
  const { data: user } = await supabase.auth.getUser()
  const { error } = await supabase
    .from('products')
    .update({
      deleted_at: new Date().toISOString(),
      deleted_by: user.user?.id ?? null,
    })
    .eq('id', productId)
  if (error) throw error
}

export async function getProductQuantities(ids: string[]): Promise<Record<string, number>> {
  if (ids.length === 0) return {}

  const { data, error } = await supabase.from('products').select('id, quantity').in('id', ids)
  if (error) throw error

  const map: Record<string, number> = {}
  for (const row of (data ?? []) as { id: string; quantity: number }[]) {
    map[row.id] = Number(row.quantity)
  }
  return map
}