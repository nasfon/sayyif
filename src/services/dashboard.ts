import { supabase } from '../lib/supabase'
import type { CashierDashboard, DashboardRecentSale, DashboardSummary } from '../types/dashboard'

function mapRecentSale(s: Record<string, unknown>): DashboardRecentSale {
  return {
    id: String(s.id),
    receipt_number: String(s.receipt_number),
    total: Number(s.total),
    payment_method: String(s.payment_method) as DashboardRecentSale['payment_method'],
    status: String(s.status) as DashboardRecentSale['status'],
    created_at: String(s.created_at),
  }
}

const EMPTY_SUMMARY: DashboardSummary = {
  total_products: 0,
  total_customers: 0,
  sales_today: 0,
  revenue_today: 0,
  total_revenue: 0,
  outstanding_credit: 0,
  total_expenses: 0,
  low_stock_count: 0,
  recent_sales: [],
}

export async function getDashboardSummary(shopId?: string): Promise<DashboardSummary> {
  const { data, error } = await supabase.rpc('dashboard_summary', { p_shop_id: shopId ?? null })
  if (error) throw error

  const rows = (data ?? []) as Array<Record<string, unknown>>
  const row = rows[0]
  if (!row) return EMPTY_SUMMARY

  const recentSales = (row.recent_sales ?? []) as Array<Record<string, unknown>>
  return {
    total_products: Number(row.total_products),
    total_customers: Number(row.total_customers),
    sales_today: Number(row.sales_today),
    revenue_today: Number(row.revenue_today),
    total_revenue: Number(row.total_revenue),
    outstanding_credit: Number(row.outstanding_credit),
    total_expenses: Number(row.total_expenses),
    low_stock_count: Number(row.low_stock_count),
    recent_sales: recentSales.map(mapRecentSale),
  }
}

export async function getCashierDashboard(): Promise<CashierDashboard> {
  const { data, error } = await supabase.rpc('cashier_dashboard')
  if (error) throw error

  const rows = (data ?? []) as Array<Record<string, unknown>>
  const row = rows[0]
  if (!row) return { sales_today: 0, recent_sales: [] }

  const recentSales = (row.recent_sales ?? []) as Array<Record<string, unknown>>
  return {
    sales_today: Number(row.sales_today),
    recent_sales: recentSales.map(mapRecentSale),
  }
}