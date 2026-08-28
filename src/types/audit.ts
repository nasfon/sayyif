export interface AuditUser {
  id: string
  full_name: string
  role: string
}

export interface AuditLogRecord {
  id: string
  shop_id: string | null
  user_id: string | null
  action: string
  entity: string
  entity_id: string | null
  reason: string | null
  ip_address: string | null
  created_at: string
  user: AuditUser | null
}

export interface AuditLogListParams {
  page: number
  pageSize: number
  search?: string
  shopId?: string
  userId?: string
  action?: string
  dateFrom?: string
  dateTo?: string
}

export interface AuditLogListResult {
  rows: AuditLogRecord[]
  count: number
}

export const AUDIT_ACTIONS = [
  'sale_created',
  'sale_corrected',
  'sale_reversed',
  'credit_payment_recorded',
  'user_created',
  'user_onboarded',
  'user_updated',
  'user_password_reset',
] as const

export const AUDIT_ACTION_LABELS: Record<string, string> = {
  sale_created: 'Sale created',
  sale_corrected: 'Sale corrected',
  sale_reversed: 'Sale reversed',
  credit_payment_recorded: 'Credit payment',
  user_created: 'User created',
  user_onboarded: 'User onboarded',
  user_updated: 'User updated',
  user_password_reset: 'Password reset',
}