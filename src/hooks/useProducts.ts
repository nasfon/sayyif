import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import * as productsService from '../services/products'
import type {
  CreateProductInput,
  ProductListParams,
  UpdateProductInput,
} from '../types/products'

export function useProductsList(params: ProductListParams) {
  return useQuery({
    queryKey: ['products', 'list', params],
    queryFn: () => productsService.listProducts(params),
    placeholderData: keepPreviousData,
  })
}

export function useInfiniteProductsList(params: Omit<ProductListParams, 'page' | 'pageSize'>, pageSize = 15) {
  return useInfiniteQuery({
    queryKey: ['products', 'infinite', params, pageSize],
    queryFn: ({ pageParam }) => productsService.listProducts({ ...params, page: pageParam, pageSize }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((total, page) => total + page.rows.length, 0)
      return loaded < lastPage.count ? allPages.length : undefined
    },
    placeholderData: keepPreviousData,
  })
}

export function useCreateProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateProductInput) => productsService.createProduct(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })
}

export function useUpdateProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: UpdateProductInput) => productsService.updateProduct(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })
}

export function useDeleteProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (productId: string) => productsService.softDeleteProduct(productId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })
}