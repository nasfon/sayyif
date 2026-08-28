import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import * as expensesService from '../services/expenses'
import type { CreateExpenseInput, ExpenseListParams } from '../types/expenses'

export function useExpensesList(params: ExpenseListParams) {
  return useQuery({
    queryKey: ['expenses', 'list', params],
    queryFn: () => expensesService.listExpenses(params),
    placeholderData: keepPreviousData,
  })
}

export function useInfiniteExpensesList(
  params: Omit<ExpenseListParams, 'page' | 'pageSize'>,
  pageSize = 15,
) {
  return useInfiniteQuery({
    queryKey: ['expenses', 'infinite', params, pageSize],
    queryFn: ({ pageParam }) =>
      expensesService.listExpenses({ ...params, page: pageParam, pageSize }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((total, page) => total + page.rows.length, 0)
      return loaded < lastPage.count ? allPages.length : undefined
    },
    placeholderData: keepPreviousData,
  })
}

export function useCreateExpense() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateExpenseInput) => expensesService.createExpense(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}