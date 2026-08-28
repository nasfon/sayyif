export interface ReportSummary {
  sales_count: number
  sales_total: number
  expenses_total: number
  credit_outstanding: number
  credit_collected: number
  products_total: number
  low_stock_count: number
  inventory_value: number
  net_profit: number
}

export interface ReportFilters {
  shopId?: string
  dateFrom?: string
  dateTo?: string
}
