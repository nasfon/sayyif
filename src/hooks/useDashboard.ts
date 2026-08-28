import { useQuery } from '@tanstack/react-query'
import * as dashboardService from '../services/dashboard'

export function useDashboardSummary(shopId?: string) {
  return useQuery({
    queryKey: ['dashboard', 'summary', shopId ?? null],
    queryFn: () => dashboardService.getDashboardSummary(shopId),
    staleTime: 30_000,
  })
}

export function useCashierDashboard() {
  return useQuery({
    queryKey: ['dashboard', 'cashier'],
    queryFn: () => dashboardService.getCashierDashboard(),
    staleTime: 30_000,
  })
}