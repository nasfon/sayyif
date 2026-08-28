import { supabase } from '../lib/supabase'
import type {
  AuditLogListParams,
  AuditLogListResult,
  AuditLogRecord,
  AuditUser,
} from '../types/audit'

const auditSelect =
  'id, shop_id, user_id, action, entity, entity_id, reason, ip_address, created_at, user:users(id, full_name, role:roles(name))'

function mapAuditRow(row: Record<string, unknown>): AuditLogRecord {
  const user = (row.user ?? null) as
    | { id: string; full_name: string; role: { name: string } | null }
    | null

  const auditUser: AuditUser | null = user
    ? { id: user.id, full_name: user.full_name, role: user.role?.name ?? '' }
    : null

  return {
    id: row.id as string,
    shop_id: row.shop_id as string | null,
    user_id: row.user_id as string | null,
    action: row.action as string,
    entity: row.entity as string,
    entity_id: row.entity_id as string | null,
    reason: row.reason as string | null,
    ip_address: row.ip_address as string | null,
    created_at: row.created_at as string,
    user: auditUser,
  }
}

export async function listAuditLogs(params: AuditLogListParams): Promise<AuditLogListResult> {
  const { page, pageSize, search, shopId, userId, action, dateFrom, dateTo } = params
  const from = page * pageSize
  const to = from + pageSize - 1

  let query = supabase
    .from('audit_logs')
    .select(auditSelect, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (shopId) {
    query = query.eq('shop_id', shopId)
  }
  if (userId) {
    query = query.eq('user_id', userId)
  }
  if (action) {
    query = query.eq('action', action)
  }
  if (search) {
    query = query.or(
      `action.ilike.%${search}%,entity.ilike.%${search}%,user.full_name.ilike.%${search}%`,
    )
  }
  if (dateFrom) {
    query = query.gte('created_at', `${dateFrom}T00:00:00.000Z`)
  }
  if (dateTo) {
    query = query.lte('created_at', `${dateTo}T23:59:59.999Z`)
  }

  const { data, error, count } = await query
  if (error) throw error

  const rows = (data ?? []).map((row) => mapAuditRow(row as Record<string, unknown>))
  return { rows, count: count ?? rows.length }
}

export async function listSaleAuditTrail(saleId: string): Promise<AuditLogRecord[]> {
  if (!saleId) return []

  const { data, error } = await supabase
    .from('audit_logs')
    .select(auditSelect)
    .eq('entity', 'sale')
    .eq('entity_id', saleId)
    .order('created_at', { ascending: true })

  if (error) throw error

  return (data ?? []).map((row) => mapAuditRow(row as Record<string, unknown>))
}