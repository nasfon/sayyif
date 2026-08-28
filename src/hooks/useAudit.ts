import {
  keepPreviousData,
  useInfiniteQuery,
  useQuery,
} from '@tanstack/react-query'
import * as auditService from '../services/audit'
import type { AuditLogListParams, AuditLogRecord } from '../types/audit'

export function useAuditLogs(params: AuditLogListParams) {
  return useQuery({
    queryKey: ['audit-logs', 'list', params],
    queryFn: () => auditService.listAuditLogs(params),
    placeholderData: keepPreviousData,
  })
}

export function useInfiniteAuditLogs(
  params: Omit<AuditLogListParams, 'page' | 'pageSize'>,
  pageSize = 15,
) {
  return useInfiniteQuery({
    queryKey: ['audit-logs', 'infinite', params, pageSize],
    queryFn: ({ pageParam }) => auditService.listAuditLogs({ ...params, page: pageParam, pageSize }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((total, page) => total + page.rows.length, 0)
      return loaded < lastPage.count ? allPages.length : undefined
    },
    placeholderData: keepPreviousData,
  })
}

export function useSaleAuditTrail(saleId: string | null) {
  return useQuery<AuditLogRecord[]>({
    queryKey: ['audit-logs', 'sale', saleId],
    queryFn: () => auditService.listSaleAuditTrail(saleId as string),
    enabled: Boolean(saleId),
  })
}