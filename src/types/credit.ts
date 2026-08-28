import type { CustomerRecord } from './customers'

export type CreditPaymentMethod = 'cash' | 'card' | 'transfer'

export const CREDIT_PAYMENT_METHOD_LABELS: Record<CreditPaymentMethod, string> = {
  cash: 'Cash',
  card: 'Card / POS',
  transfer: 'Bank Transfer',
}

export interface CreditCustomerParams {
  page: number
  pageSize: number
  search?: string
  shopId?: string
}

export interface CreditCustomerResult {
  rows: CustomerRecord[]
  count: number
}

export interface CreditPaymentRecord {
  id: string
  shop_id: string
  customer_id: string
  sale_id: string | null
  amount: number
  payment_method: CreditPaymentMethod
  received_by: string
  received_by_name: string | null
  created_at: string
}

export interface CreditPaymentParams {
  page: number
  pageSize: number
}

export interface CreditPaymentResult {
  rows: CreditPaymentRecord[]
  count: number
}

export interface RecordCreditPaymentInput {
  customer_id: string
  amount: number
  payment_method: CreditPaymentMethod
}

export interface ManualCreditRecord {
  id: string
  shop_id: string
  customer_id: string
  amount: number
  paid_amount: number
  remaining_credit: number
  reason: string | null
  created_by: string
  created_at: string
}

export interface ManualCreditParams {
  page: number
  pageSize: number
}

export interface ManualCreditResult {
  rows: ManualCreditRecord[]
  count: number
}

export interface RecordManualCreditInput {
  customer_id: string
  amount: number
  reason?: string
}

export interface CreditSummary {
  total_outstanding: number
  customer_count: number
}