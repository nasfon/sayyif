import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import * as rolesService from '../services/roles'
import * as usersService from '../services/users'
import type {
  CreateUserInput,
  OnboardUserInput,
  UpdateUserInput,
  UserListParams,
} from '../types/users'

export { useShops } from './useShops'

export function useUsers(params: UserListParams) {
  return useQuery({
    queryKey: ['users', params],
    queryFn: () => usersService.listUsers(params),
    placeholderData: keepPreviousData,
  })
}

export function useInfiniteUsersList(
  params: Omit<UserListParams, 'page' | 'pageSize'>,
  pageSize = 15,
) {
  return useInfiniteQuery({
    queryKey: ['users', 'infinite', params, pageSize],
    queryFn: ({ pageParam }) => usersService.listUsers({ ...params, page: pageParam, pageSize }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((total, page) => total + page.rows.length, 0)
      return loaded < lastPage.count ? allPages.length : undefined
    },
    placeholderData: keepPreviousData,
  })
}

export function useUnassignedUsers() {
  return useQuery({
    queryKey: ['users', 'unassigned'],
    queryFn: () => usersService.listUnassignedAuthUsers(),
    staleTime: 30_000,
  })
}

export function useUserOptions(shopId: string | null) {
  return useQuery({
    queryKey: ['users', 'options', shopId ?? null],
    queryFn: () => usersService.listUserOptions(shopId ?? undefined),
    staleTime: 60_000,
  })
}

export function useRoles() {
  return useQuery({
    queryKey: ['roles'],
    queryFn: () => rolesService.listRoles(),
    staleTime: Infinity,
  })
}

export function useCreateUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateUserInput) => usersService.createUser(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      queryClient.invalidateQueries({ queryKey: ['users', 'unassigned'] })
    },
  })
}

export function useOnboardUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: OnboardUserInput) => usersService.onboardUser(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      queryClient.invalidateQueries({ queryKey: ['users', 'unassigned'] })
      queryClient.invalidateQueries({ queryKey: ['auth', 'profile'] })
    },
  })
}

export function useUpdateUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: UpdateUserInput) => usersService.updateUser(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      queryClient.invalidateQueries({ queryKey: ['auth', 'profile'] })
    },
  })
}

export function useResetPassword() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { userId: string; newPassword: string }) =>
      usersService.resetPassword(input.userId, input.newPassword),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })
}

export function useDeleteUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) => usersService.deleteUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })
}