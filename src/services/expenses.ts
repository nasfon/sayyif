import { supabase } from '../lib/supabase'
import type {
  CreateExpenseInput,
  ExpenseListParams,
  ExpenseListResult,
  ExpenseRecord,
} from '../types/expenses'

const expenseSelect =
  'id, shop_id, description, amount, expense_date, recorded_by, created_at, recorded_by_user:users(full_name), shop:shops(name)'

function mapExpenseRow(row: Record<string, unknown>): ExpenseRecord {
  const recordedByUser = row.recorded_by_user as { full_name?: string } | null
  const shop = row.shop as { name?: string } | null
  return {
    id: row.id as string,
    shop_id: row.shop_id as string,
    description: row.description as string,
    amount: Number(row.amount),
    expense_date: row.expense_date as string,
    recorded_by: row.recorded_by as string,
    recorded_by_name: recordedByUser?.full_name,
    shop_name: shop?.name,
    created_at: row.created_at as string,
  }
}

export async function createExpense(input: CreateExpenseInput): Promise<void> {
  const { data: user } = await supabase.auth.getUser()
  const { error } = await supabase.from('expenses').insert({
    shop_id: input.shop_id,
    description: input.description,
    amount: input.amount,
    expense_date: input.expense_date,
    recorded_by: user.user?.id,
  })
  if (error) throw error
}

export async function listExpenses(params: ExpenseListParams): Promise<ExpenseListResult> {
  const { page, pageSize, search, shopId, fromDate, toDate } = params
  const from = page * pageSize
  const to = from + pageSize - 1

  let query = supabase
    .from('expenses')
    .select(expenseSelect, { count: 'exact' })
    .order('expense_date', { ascending: false })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (shopId) {
    query = query.eq('shop_id', shopId)
  }
  if (search) {
    query = query.ilike('description', `%${search}%`)
  }
  if (fromDate) {
    query = query.gte('expense_date', fromDate)
  }
  if (toDate) {
    query = query.lte('expense_date', toDate)
  }

  const { data, error, count } = await query
  if (error) throw error

  const rows = (data ?? []).map((row) => mapExpenseRow(row as Record<string, unknown>))
  return { rows, count: count ?? rows.length }
}