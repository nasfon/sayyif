export type PaymentMethod = 'cash' | 'card' | 'transfer' | 'credit'

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Cash',
  card: 'Card / POS',
  transfer: 'Bank Transfer',
  credit: 'Credit',
}

export type SaleStatus = 'completed' | 'corrected' | 'reversed'

export interface SaleItemInput {
  product_id: string
  quantity: number
}

export interface CorrectSaleInput {
  sale_id: string
  items: SaleItemInput[]
  reason: string
}

export interface ReverseSaleInput {
  sale_id: string
  reason: string
}

export interface CreateSaleInput {
  shop_id: string
  customer_id: string | null
  items: SaleItemInput[]
  amount_paid: number
  payment_method: PaymentMethod
}

export interface SaleItemRecord {
  id: string
  product_id: string | null
  product_name: string
  quantity: number
  unit_price: number
  total_price: number
}

export interface SaleRecord {
  id: string
  shop_id: string
  customer_id: string | null
  customer_name: string | null
  cashier_id: string
  receipt_number: string
  subtotal: number
  total: number
  amount_paid: number
  remaining_credit: number
  payment_method: PaymentMethod
  status: SaleStatus
  created_at: string
  updated_at: string
}

export interface SaleDetail extends SaleRecord {
  items: SaleItemRecord[]
}

export interface SaleListParams {
  page: number
  pageSize: number
  search?: string
  shopId?: string
  status?: SaleStatus | ''
  paymentMethod?: PaymentMethod | ''
  dateFrom?: string
  dateTo?: string
}

export interface SaleListRow extends SaleRecord {
  customer_name: string | null
}

export interface SaleListResult {
  rows: SaleListRow[]
  count: number
}