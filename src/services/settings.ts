import { supabase } from '../lib/supabase'
import type { BusinessSettings } from '../types/settings'

const EMPTY_SETTINGS: BusinessSettings = {
  id: '',
  shop_id: '',
  business_name: '',
  phone: null,
  address: null,
  logo_url: null,
  receipt_footer: null,
  updated_at: '',
}

export async function getBusinessSettings(shopId: string): Promise<BusinessSettings> {
  if (!shopId) return { ...EMPTY_SETTINGS }
  const { data, error } = await supabase
    .from('business_settings')
    .select('id, shop_id, business_name, phone, address, logo_url, receipt_footer, updated_at')
    .eq('shop_id', shopId)
    .maybeSingle()

  if (error) throw error
  if (!data) return { ...EMPTY_SETTINGS, shop_id: shopId }
  return data as BusinessSettings
}

export interface UpdateBusinessSettingsInput {
  shop_id: string
  business_name: string
  phone?: string
  address?: string
  logo_url?: string
  receipt_footer?: string
  updated_by?: string | null
}

export async function updateBusinessSettings(input: UpdateBusinessSettingsInput): Promise<void> {
  const { error } = await supabase.from('business_settings').upsert(
    {
      shop_id: input.shop_id,
      business_name: input.business_name,
      phone: input.phone || null,
      address: input.address || null,
      logo_url: input.logo_url || null,
      receipt_footer: input.receipt_footer || null,
      updated_by: input.updated_by ?? null,
    },
    { onConflict: 'shop_id' },
  )
  if (error) throw error
}
