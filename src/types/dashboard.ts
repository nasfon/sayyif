import type { PaymentMethod, SaleStatus } from './sales'

export interface DashboardRecentSale {
  id: string
  receipt_number: string
  total: number
  payment_method: PaymentMethod
  status: SaleStatus
  created_at: string
}

export interface DashboardSummary {
  total_products: number
  total_customers: number
  sales_today: number
  revenue_today: number
  total_revenue: number
  outstanding_credit: number
  total_expenses: number
  low_stock_count: number
  recent_sales: DashboardRecentSale[]
}

export interface CashierDashboard {
  sales_today: number
  recent_sales: DashboardRecentSale[]
}