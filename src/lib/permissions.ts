import type { RoleName } from '../types/auth'

export type Permission =
  | 'dashboard.view'
  | 'products.read'
  | 'products.browse'
  | 'products.create'
  | 'products.update'
  | 'products.delete'
  | 'customers.read'
  | 'customers.browse'
  | 'customers.create'
  | 'customers.update'
  | 'customers.delete'
  | 'sales.read'
  | 'sales.history'
  | 'sales.create'
  | 'sales.correct'
  | 'sales.reverse'
  | 'receipts.print'
  | 'receipts.pdf'
  | 'credit.read'
  | 'credit.manage'
  | 'expenses.read'
  | 'expenses.create'
  | 'expenses.update'
  | 'expenses.delete'
  | 'reports.view'
  | 'audit_logs.view'
  | 'shops.manage'
  | 'users.manage'
  | 'settings.manage'

const ALL_PERMISSIONS: Permission[] = [
  'dashboard.view',
  'products.read',
  'products.browse',
  'products.create',
  'products.update',
  'products.delete',
  'customers.read',
  'customers.browse',
  'customers.create',
  'customers.update',
  'customers.delete',
  'sales.read',
  'sales.history',
  'sales.create',
  'sales.correct',
  'sales.reverse',
  'receipts.print',
  'receipts.pdf',
  'credit.read',
  'credit.manage',
  'expenses.read',
  'expenses.create',
  'expenses.update',
  'expenses.delete',
  'reports.view',
  'audit_logs.view',
  'shops.manage',
  'users.manage',
  'settings.manage',
]

const SUPER_ADMIN_PERMISSIONS = new Set<Permission>(ALL_PERMISSIONS)

const SHOP_ADMIN_PERMISSIONS = new Set<Permission>(
  ALL_PERMISSIONS.filter((permission) => permission !== 'shops.manage'),
)

const CASHIER_PERMISSIONS = new Set<Permission>([
  'dashboard.view',
  'products.read',
  'customers.read',
  'sales.read',
  'sales.create',
  'receipts.print',
  'receipts.pdf',
])

const ROLE_PERMISSIONS: Record<RoleName, Set<Permission>> = {
  super_admin: SUPER_ADMIN_PERMISSIONS,
  shop_admin: SHOP_ADMIN_PERMISSIONS,
  cashier: CASHIER_PERMISSIONS,
}

export function can(
  role: RoleName | null | undefined,
  permission: Permission,
): boolean {
  if (!role) return false
  return ROLE_PERMISSIONS[role].has(permission)
}

export function canAny(
  role: RoleName | null | undefined,
  permissions: Permission[],
): boolean {
  return permissions.some((permission) => can(role, permission))
}

export function permissionsForRole(role: RoleName | null | undefined): Set<Permission> {
  if (!role) return new Set()
  return new Set(ROLE_PERMISSIONS[role])
}
