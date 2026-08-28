import { supabase } from '../lib/supabase'
import type { ShopOption } from '../types/users'
import type {
  CreateShopInput,
  ShopListParams,
  ShopListResult,
  ShopRecord,
  UpdateShopInput,
} from '../types/shops'

const shopSelect =
  'id, name, phone, email, address, logo_url, receipt_footer, is_active, created_at, updated_at'

export async function listActiveShops(): Promise<ShopOption[]> {
  const { data, error } = await supabase
    .from('shops')
    .select('id, name')
    .eq('is_active', true)
    .order('name')

  if (error) throw error

  return (data ?? []).map((row) => ({ id: row.id as string, name: row.name as string }))
}

export async function getShop(shopId: string): Promise<ShopRecord | null> {
  const { data, error } = await supabase
    .from('shops')
    .select(`${shopSelect}, business_settings(business_name, phone, address, logo_url, receipt_footer)`)
    .eq('id', shopId)
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  const row = data as ShopRecord & {
    business_settings?: Array<{
      business_name: string
      phone: string | null
      address: string | null
      logo_url: string | null
      receipt_footer: string | null
    }> | null
  }

  const settings = row.business_settings?.[0] ?? null
  const shop = { ...row } as Omit<typeof row, 'business_settings'> as ShopRecord
  if (settings) {
    return {
      ...shop,
      name: settings.business_name || shop.name,
      phone: settings.phone ?? shop.phone,
      address: settings.address ?? shop.address,
      logo_url: settings.logo_url ?? shop.logo_url,
      receipt_footer: settings.receipt_footer ?? shop.receipt_footer,
    }
  }

  return shop
}

export async function listShops(params: ShopListParams): Promise<ShopListResult> {
  const { page, pageSize, search, status } = params
  const from = page * pageSize
  const to = from + pageSize - 1

  let query = supabase
    .from('shops')
    .select(shopSelect, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (search) {
    query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`)
  }
  if (status === 'active') {
    query = query.eq('is_active', true)
  } else if (status === 'inactive') {
    query = query.eq('is_active', false)
  }

  const { data, error, count } = await query
  if (error) throw error

  return { rows: (data ?? []) as ShopRecord[], count: count ?? data?.length ?? 0 }
}

export async function createShop(input: CreateShopInput): Promise<void> {
  const { error } = await supabase.from('shops').insert({
    name: input.name,
    phone: input.phone ?? null,
    email: input.email ?? null,
    address: input.address ?? null,
    logo_url: input.logo_url ?? null,
    receipt_footer: input.receipt_footer ?? null,
  })
  if (error) throw error
}

export async function updateShop(input: UpdateShopInput): Promise<void> {
  const { error } = await supabase
    .from('shops')
    .update({
      name: input.name,
      phone: input.phone ?? null,
      email: input.email ?? null,
      address: input.address ?? null,
      logo_url: input.logo_url ?? null,
      receipt_footer: input.receipt_footer ?? null,
      is_active: input.is_active,
    })
    .eq('id', input.shop_id)
  if (error) throw error
}