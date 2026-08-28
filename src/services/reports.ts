import { supabase } from '../lib/supabase'
import type { ReportSummary } from '../types/reports'

const EMPTY_REPORT: ReportSummary = {
  sales_count: 0,
  sales_total: 0,
  expenses_total: 0,
  credit_outstanding: 0,
  credit_collected: 0,
  products_total: 0,
  low_stock_count: 0,
  inventory_value: 0,
  net_profit: 0,
}

export async function getReportSummary(
  shopId?: string,
  dateFrom?: string,
  dateTo?: string,
): Promise<ReportSummary> {
  const { data, error } = await supabase.rpc('report_summary', {
    p_shop_id: shopId ?? null,
    p_date_from: dateFrom ?? null,
    p_date_to: dateTo ?? null,
  })
  if (error) throw error

  const rows = (data ?? []) as Array<Record<string, unknown>>
  const row = rows[0]
  if (!row) return EMPTY_REPORT

  return {
    sales_count: Number(row.sales_count),
    sales_total: Number(row.sales_total),
    expenses_total: Number(row.expenses_total),
    credit_outstanding: Number(row.credit_outstanding),
    credit_collected: Number(row.credit_collected),
    products_total: Number(row.products_total),
    low_stock_count: Number(row.low_stock_count),
    inventory_value: Number(row.inventory_value),
    net_profit: Number(row.net_profit),
  }
}
