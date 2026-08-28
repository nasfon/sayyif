import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as settingsService from '../services/settings'

export function useBusinessSettings(shopId: string | undefined) {
  return useQuery({
    queryKey: ['business-settings', shopId ?? null],
    queryFn: () => settingsService.getBusinessSettings(shopId as string),
    enabled: Boolean(shopId),
    staleTime: 30_000,
  })
}

export function useUpdateBusinessSettings() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: settingsService.UpdateBusinessSettingsInput) => settingsService.updateBusinessSettings(input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['business-settings', variables.shop_id] })
      queryClient.invalidateQueries({ queryKey: ['shops', 'detail'] })
    },
  })
}
