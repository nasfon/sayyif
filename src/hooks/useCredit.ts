import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import * as creditService from '../services/credit'
import type {
  CreditCustomerParams,
  CreditPaymentParams,
  ManualCreditParams,
  RecordCreditPaymentInput,
  RecordManualCreditInput,
} from '../types/credit'

export function useCustomersWithCredit(params: CreditCustomerParams) {
  return useQuery({
    queryKey: ['credit', 'customers', params],
    queryFn: () => creditService.listCustomersWithCredit(params),
    placeholderData: keepPreviousData,
  })
}

export function useCustomerPayments(customerId: string, params: CreditPaymentParams) {
  return useQuery({
    queryKey: ['credit', 'payments', customerId, params],
    queryFn: () => creditService.listCustomerPayments(customerId, params),
    placeholderData: keepPreviousData,
  })
}

export function useInfiniteCreditCustomers(
  params: Omit<CreditCustomerParams, 'page' | 'pageSize'>,
  pageSize = 15,
) {
  return useInfiniteQuery({
    queryKey: ['credit', 'customers', 'infinite', params, pageSize],
    queryFn: ({ pageParam }) =>
      creditService.listCustomersWithCredit({ ...params, page: pageParam, pageSize }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((total, page) => total + page.rows.length, 0)
      return loaded < lastPage.count ? allPages.length : undefined
    },
    placeholderData: keepPreviousData,
  })
}

export function useCreditSummary(shopId: string) {
  return useQuery({
    queryKey: ['credit', 'summary', shopId],
    queryFn: () => creditService.getCreditSummary(shopId || undefined),
    staleTime: 30_000,
  })
}

export function useRecordCreditPayment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: RecordCreditPaymentInput) => creditService.recordCreditPayment(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credit'] })
      queryClient.invalidateQueries({ queryKey: ['customers'] })
    },
  })
}

export function useCustomerManualCredits(customerId: string, params: ManualCreditParams) {
  return useQuery({
    queryKey: ['credit', 'manual-credits', customerId, params],
    queryFn: () => creditService.listCustomerManualCredits(customerId, params),
    placeholderData: keepPreviousData,
  })
}

export function useRecordManualCredit() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: RecordManualCreditInput) => creditService.recordManualCredit(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credit'] })
      queryClient.invalidateQueries({ queryKey: ['customers'] })
    },
  })
}