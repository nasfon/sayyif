import { supabase } from '../lib/supabase'
import type { CustomerSalesParams, CustomerSalesResult } from '../types/customers'
import type {
  CorrectSaleInput,
  CreateSaleInput,
  PaymentMethod,
  ReverseSaleInput,
  SaleDetail,
  SaleItemRecord,
  SaleListParams,
  SaleListResult,
  SaleRecord,
  SaleStatus,
} from '../types/sales'

const saleSelect =
  'id, shop_id, customer_id, cashier_id, receipt_number, subtotal, total, amount_paid, remaining_credit, payment_method, status, created_at, updated_at'

function mapSaleRow(row: Record<string, unknown>): SaleRecord {
  const customer = (row.customer as { full_name?: string } | undefined)?.full_name
  return {
    id: row.id as string,
    shop_id: row.shop_id as string,
    customer_id: row.customer_id as string | null,
    customer_name: (customer ?? (row.customer_name as string | null)) ?? null,
    cashier_id: row.cashier_id as string,
    receipt_number: row.receipt_number as string,
    subtotal: Number(row.subtotal),
    total: Number(row.total),
    amount_paid: Number(row.amount_paid),
    remaining_credit: Number(row.remaining_credit),
    payment_method: row.payment_method as PaymentMethod,
    status: row.status as SaleStatus,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  }
}

export async function createSale(input: CreateSaleInput): Promise<string> {
  const { data, error } = await supabase.rpc('create_sale', {
    p_shop_id: input.shop_id,
    p_customer_id: input.customer_id,
    p_items: input.items.map((item) => ({
      product_id: item.product_id,
      quantity: item.quantity,
    })),
    p_amount_paid: input.amount_paid,
    p_payment_method: input.payment_method,
  })
  if (error) throw error
  return data as string
}

export async function getSale(saleId: string): Promise<SaleDetail> {
  const { data, error } = await supabase
    .from('sales')
    .select(
      `${saleSelect}, customer:customers(full_name), items:sale_items(id, product_id, product_name, quantity, unit_price, total_price)`,
    )
    .eq('id', saleId)
    .single()

  if (error) throw error

  const row = data as Record<string, unknown> & { items?: Record<string, unknown>[] }

  const items: SaleItemRecord[] = (row.items ?? []).map((item) => ({
    id: item.id as string,
    product_id: item.product_id as string | null,
    product_name: item.product_name as string,
    quantity: Number(item.quantity),
    unit_price: Number(item.unit_price),
    total_price: Number(item.total_price),
  }))

  return {
    ...mapSaleRow(row),
    items,
  }
}

export async function listCustomerSales(
  customerId: string,
  params: CustomerSalesParams,
): Promise<CustomerSalesResult> {
  const { page, pageSize } = params
  const from = page * pageSize
  const to = from + pageSize - 1

  const { data, error, count } = await supabase
    .from('sales')
    .select(saleSelect, { count: 'exact' })
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) throw error

  const rows = (data ?? []).map((row) => mapSaleRow(row as Record<string, unknown>))
  return { rows, count: count ?? rows.length }
}

export async function correctSale(input: CorrectSaleInput): Promise<string> {
  const { data, error } = await supabase.rpc('correct_sale', {
    p_sale_id: input.sale_id,
    p_items: input.items.map((item) => ({
      product_id: item.product_id,
      quantity: item.quantity,
    })),
    p_reason: input.reason,
  })
  if (error) throw error
  return data as string
}

export async function reverseSale(input: ReverseSaleInput): Promise<string> {
  const { data, error } = await supabase.rpc('reverse_sale', {
    p_sale_id: input.sale_id,
    p_reason: input.reason,
  })
  if (error) throw error
  return data as string
}

export async function listSales(params: SaleListParams): Promise<SaleListResult> {
  const { page, pageSize, search, shopId, status, paymentMethod, dateFrom, dateTo } = params
  const from = page * pageSize
  const to = from + pageSize - 1

  let query = supabase
    .from('sales')
    .select(`${saleSelect}, customer:customers(full_name)`, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (shopId) {
    query = query.eq('shop_id', shopId)
  }
  if (search) {
    query = query.or(`receipt_number.ilike.%${search}%,customer.full_name.ilike.%${search}%`)
  }
  if (status) {
    query = query.eq('status', status)
  }
  if (paymentMethod) {
    query = query.eq('payment_method', paymentMethod)
  }
  if (dateFrom) {
    query = query.gte('created_at', `${dateFrom}T00:00:00.000Z`)
  }
  if (dateTo) {
    query = query.lte('created_at', `${dateTo}T23:59:59.999Z`)
  }

  const { data, error, count } = await query
  if (error) throw error

  const rows = (data ?? []).map((row) => {
    const sale = mapSaleRow(row as Record<string, unknown>)
    const customer = (row as { customer?: { full_name?: string } }).customer
    return { ...sale, customer_name: customer?.full_name ?? null }
  })
  return { rows, count: count ?? rows.length }
}