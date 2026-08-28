import { supabase } from '../lib/supabase'
import type {
  CreateCustomerInput,
  CustomerListParams,
  CustomerListResult,
  CustomerPurchaseTotals,
  CustomerRecord,
  UpdateCustomerInput,
} from '../types/customers'

const customerSelect =
  'id, shop_id, full_name, phone, email, address, total_credit, created_at, updated_at'

function mapCustomerRow(row: Record<string, unknown>): CustomerRecord {
  return {
    id: row.id as string,
    shop_id: row.shop_id as string,
    full_name: row.full_name as string,
    phone: row.phone as string,
    email: row.email as string | null,
    address: row.address as string | null,
    total_credit: Number(row.total_credit),
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  }
}

export async function listCustomers(params: CustomerListParams): Promise<CustomerListResult> {
  const { page, pageSize, search, shopId } = params
  const from = page * pageSize
  const to = from + pageSize - 1

  let query = supabase
    .from('customers')
    .select(customerSelect, { count: 'exact' })
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .range(from, to)

  if (shopId) {
    query = query.eq('shop_id', shopId)
  }
  if (search) {
    query = query.or(`full_name.ilike.%${search}%,phone.ilike.%${search}%`)
  }

  const { data, error, count } = await query
  if (error) throw error

  const rows = (data ?? []).map((row) => mapCustomerRow(row as Record<string, unknown>))
  return { rows, count: count ?? rows.length }
}

export async function createCustomer(input: CreateCustomerInput): Promise<void> {
  const { error } = await supabase.from('customers').insert({
    shop_id: input.shop_id,
    full_name: input.full_name,
    phone: input.phone,
    email: input.email ?? null,
    address: input.address ?? null,
  })
  if (error) throw error
}

export async function getCustomer(customerId: string): Promise<CustomerRecord | null> {
  const { data, error } = await supabase
    .from('customers')
    .select(customerSelect)
    .eq('id', customerId)
    .is('deleted_at', null)
    .maybeSingle()

  if (error) throw error
  if (!data) return null
  return mapCustomerRow(data as Record<string, unknown>)
}

export async function getCustomerPurchaseTotals(
  shopId?: string,
  customerId?: string,
): Promise<CustomerPurchaseTotals[]> {
  const { data, error } = await supabase.rpc('customer_purchase_totals', {
    p_shop_id: shopId ?? null,
    p_customer_id: customerId ?? null,
  })
  if (error) throw error

  return (data ?? []).map((row: Record<string, unknown>) => ({
    customer_id: row.customer_id as string,
    purchase_count: Number(row.purchase_count),
    total_spent: Number(row.total_spent),
  }))
}

export async function updateCustomer(input: UpdateCustomerInput): Promise<void> {
  const { error } = await supabase
    .from('customers')
    .update({
      full_name: input.full_name,
      phone: input.phone,
      email: input.email ?? null,
      address: input.address ?? null,
    })
    .eq('id', input.customer_id)
  if (error) throw error
}

export async function softDeleteCustomer(customerId: string): Promise<void> {
  const { data: user } = await supabase.auth.getUser()
  const { error } = await supabase
    .from('customers')
    .update({
      deleted_at: new Date().toISOString(),
      deleted_by: user.user?.id ?? null,
    })
    .eq('id', customerId)
  if (error) throw error
}