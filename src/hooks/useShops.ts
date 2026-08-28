import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import * as shopsService from '../services/shops'
import type { CreateShopInput, ShopListParams, UpdateShopInput } from '../types/shops'

export function useShops() {
  return useQuery({
    queryKey: ['shops'],
    queryFn: () => shopsService.listActiveShops(),
    staleTime: Infinity,
  })
}

export function useShopDetail(shopId: string | null) {
  return useQuery({
    queryKey: ['shops', 'detail', shopId],
    queryFn: () => shopsService.getShop(shopId as string),
    enabled: Boolean(shopId),
    staleTime: Infinity,
  })
}

export function useShopsList(params: ShopListParams) {
  return useQuery({
    queryKey: ['shops', 'list', params],
    queryFn: () => shopsService.listShops(params),
    placeholderData: keepPreviousData,
  })
}

export function useInfiniteShopsList(
  params: Omit<ShopListParams, 'page' | 'pageSize'>,
  pageSize = 15,
) {
  return useInfiniteQuery({
    queryKey: ['shops', 'infinite', params, pageSize],
    queryFn: ({ pageParam }) => shopsService.listShops({ ...params, page: pageParam, pageSize }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((total, page) => total + page.rows.length, 0)
      return loaded < lastPage.count ? allPages.length : undefined
    },
    placeholderData: keepPreviousData,
  })
}

export function useCreateShop() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateShopInput) => shopsService.createShop(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shops'] })
    },
  })
}

export function useUpdateShop() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: UpdateShopInput) => shopsService.updateShop(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shops'] })
    },
  })
}