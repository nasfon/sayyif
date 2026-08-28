import { useQuery } from '@tanstack/react-query'
import * as reportsService from '../services/reports'

export function useReportSummary(shopId?: string, dateFrom?: string, dateTo?: string) {
  return useQuery({
    queryKey: ['reports', 'summary', shopId ?? null, dateFrom ?? null, dateTo ?? null],
    queryFn: () => reportsService.getReportSummary(shopId, dateFrom, dateTo),
    staleTime: 30_000,
  })
}
