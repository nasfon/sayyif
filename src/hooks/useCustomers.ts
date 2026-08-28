import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import * as customersService from '../services/customers'
import * as salesService from '../services/sales'
import type {
  CreateCustomerInput,
  CustomerListParams,
  CustomerSalesParams,
  UpdateCustomerInput,
} from '../types/customers'

export function useCustomersList(params: CustomerListParams) {
  return useQuery({
    queryKey: ['customers', 'list', params],
    queryFn: () => customersService.listCustomers(params),
    placeholderData: keepPreviousData,
  })
}

export function useInfiniteCustomersList(
  params: Omit<CustomerListParams, 'page' | 'pageSize'>,
  pageSize = 15,
) {
  return useInfiniteQuery({
    queryKey: ['customers', 'infinite', params, pageSize],
    queryFn: ({ pageParam }) => customersService.listCustomers({ ...params, page: pageParam, pageSize }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((total, page) => total + page.rows.length, 0)
      return loaded < lastPage.count ? allPages.length : undefined
    },
    placeholderData: keepPreviousData,
  })
}

export function useCustomerProfile(customerId: string | null) {
  return useQuery({
    queryKey: ['customers', 'detail', customerId],
    queryFn: () => customersService.getCustomer(customerId as string),
    enabled: Boolean(customerId),
  })
}

export function useCustomerPurchaseHistory(customerId: string, params: CustomerSalesParams) {
  return useQuery({
    queryKey: ['customers', 'purchases', customerId, params],
    queryFn: () => salesService.listCustomerSales(customerId, params),
    placeholderData: keepPreviousData,
  })
}

export function useCustomerPurchaseTotals(shopId: string, customerId?: string) {
  return useQuery({
    queryKey: ['customers', 'purchase-totals', shopId, customerId ?? null],
    queryFn: () => customersService.getCustomerPurchaseTotals(shopId || undefined, customerId),
    staleTime: 30_000,
  })
}

export function useCreateCustomer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateCustomerInput) => customersService.createCustomer(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
    },
  })
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: UpdateCustomerInput) => customersService.updateCustomer(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
    },
  })
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (customerId: string) => customersService.softDeleteCustomer(customerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
    },
  })
}