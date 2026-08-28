export interface ExpenseRecord {
  id: string
  shop_id: string
  description: string
  amount: number
  expense_date: string
  recorded_by: string
  recorded_by_name?: string
  shop_name?: string
  created_at: string
}

export interface CreateExpenseInput {
  shop_id: string
  description: string
  amount: number
  expense_date: string
}

export interface ExpenseListParams {
  page: number
  pageSize: number
  search?: string
  shopId?: string
  fromDate?: string
  toDate?: string
}

export interface ExpenseListResult {
  rows: ExpenseRecord[]
  count: number
}