import { supabase } from '../lib/supabase'
import type { CustomerRecord } from '../types/customers'
import type {
  CreditCustomerParams,
  CreditCustomerResult,
  CreditPaymentMethod,
  CreditPaymentParams,
  CreditPaymentRecord,
  CreditPaymentResult,
  CreditSummary,
  ManualCreditParams,
  ManualCreditRecord,
  ManualCreditResult,
  RecordCreditPaymentInput,
  RecordManualCreditInput,
} from '../types/credit'

const creditCustomerSelect =
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

export async function listCustomersWithCredit(
  params: CreditCustomerParams,
): Promise<CreditCustomerResult> {
  const { page, pageSize, search, shopId } = params
  const from = page * pageSize
  const to = from + pageSize - 1

  let query = supabase
    .from('customers')
    .select(creditCustomerSelect, { count: 'exact' })
    .is('deleted_at', null)
    .gt('total_credit', 0)
    .order('total_credit', { ascending: false })
    .range(from, to)

  if (shopId) {
    query = query.eq('shop_id', shopId)
  }
  if (search) {
    query = query.or(`full_name.ilike.%${search}%,phone.ilike.%${search}%`)
  }

  const { data, error, count } = await query
  if (error) throw error

  return {
    rows: (data ?? []).map((row) => mapCustomerRow(row as Record<string, unknown>)),
    count: count ?? 0,
  }
}

export async function listCustomerPayments(
  customerId: string,
  params: CreditPaymentParams,
): Promise<CreditPaymentResult> {
  const { page, pageSize } = params
  const from = page * pageSize
  const to = from + pageSize - 1

  const { data, error, count } = await supabase
    .from('credit_payments')
    .select(
      'id, shop_id, customer_id, sale_id, amount, payment_method, received_by, created_at, cashier:users(full_name)',
      { count: 'exact' },
    )
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) throw error

  const rows = (data ?? []).map((row) => {
    const item = row as unknown as {
      id: string
      shop_id: string
      customer_id: string
      sale_id: string | null
      amount: string
      payment_method: string
      received_by: string
      created_at: string
      cashier: { full_name: string } | { full_name: string }[] | null
    }
    const cashier = Array.isArray(item.cashier) ? item.cashier[0] : item.cashier
    return {
      id: item.id,
      shop_id: item.shop_id,
      customer_id: item.customer_id,
      sale_id: item.sale_id,
      amount: Number(item.amount),
      payment_method: item.payment_method as CreditPaymentMethod,
      received_by: item.received_by,
      received_by_name: cashier?.full_name ?? null,
      created_at: item.created_at,
    } satisfies CreditPaymentRecord
  })

  return { rows, count: count ?? rows.length }
}

export async function getCreditSummary(shopId?: string): Promise<CreditSummary> {
  const { data, error } = await supabase.rpc('credit_summary', {
    p_shop_id: shopId ?? null,
  })
  if (error) throw error

  const raw = (data ?? []) as Record<string, unknown>[] | Record<string, unknown>
  const row = Array.isArray(raw) ? (raw[0] ?? {}) : raw
  return {
    total_outstanding: Number(row.total_outstanding) || 0,
    customer_count: Number(row.customer_count) || 0,
  }
}

export async function recordCreditPayment(input: RecordCreditPaymentInput): Promise<void> {
  const { error } = await supabase.rpc('record_credit_payment', {
    p_customer_id: input.customer_id,
    p_sale_id: null,
    p_amount: input.amount,
    p_payment_method: input.payment_method,
  })
  if (error) throw error
}

export async function listCustomerManualCredits(
  customerId: string,
  params: ManualCreditParams,
): Promise<ManualCreditResult> {
  const { page, pageSize } = params
  const from = page * pageSize
  const to = from + pageSize - 1

  const { data, error, count } = await supabase
    .from('manual_credits')
    .select('id, shop_id, customer_id, amount, paid_amount, remaining_credit, reason, created_by, created_at', {
      count: 'exact',
    })
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) throw error

  const rows = (data ?? []).map((row) => {
    const item = row as unknown as ManualCreditRecord
    return {
      id: item.id,
      shop_id: item.shop_id,
      customer_id: item.customer_id,
      amount: Number(item.amount),
      paid_amount: Number(item.paid_amount),
      remaining_credit: Number(item.remaining_credit),
      reason: item.reason,
      created_by: item.created_by,
      created_at: item.created_at,
    } satisfies ManualCreditRecord
  })

  return { rows, count: count ?? rows.length }
}

export async function recordManualCredit(input: RecordManualCreditInput): Promise<void> {
  const { error } = await supabase.rpc('record_manual_credit', {
    p_customer_id: input.customer_id,
    p_amount: input.amount,
    p_reason: input.reason ?? null,
  })
  if (error) throw error
}