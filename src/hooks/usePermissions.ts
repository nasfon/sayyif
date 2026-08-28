import { useMemo } from 'react'
import { useAuth } from '../hooks/useAuth'
import { can, type Permission } from '../lib/permissions'

export interface Permissions {
  isSuperAdmin: boolean
  isShopAdminOrAbove: boolean
  isAdmin: boolean
  role: 'super_admin' | 'shop_admin' | 'cashier' | null
  can: (permission: Permission) => boolean
  canAny: (permissions: Permission[]) => boolean
  canManageProducts: boolean
  canManageCustomers: boolean
  canCreateSales: boolean
  canCorrectSales: boolean
  canReverseSales: boolean
  canManageCredit: boolean
  canManageExpenses: boolean
  canViewReports: boolean
  canViewAuditLogs: boolean
  canManageShops: boolean
  canManageUsers: boolean
  canManageSettings: boolean
}

export function usePermissions(): Permissions {
  const { profile } = useAuth()
  const role = profile?.role ?? null

  return useMemo<Permissions>(() => {
    const canManageProducts = can(role, 'products.create')
    const canManageCustomers = can(role, 'customers.create')
    const isSuperAdmin = role === 'super_admin'
    const isShopAdminOrAbove = role === 'super_admin' || role === 'shop_admin'
    const isAdmin = isShopAdminOrAbove

    return {
      isSuperAdmin,
      isShopAdminOrAbove,
      isAdmin,
      role,
      can: (permission) => can(role, permission),
      canAny: (permissions) => permissions.some((permission) => can(role, permission)),
      canManageProducts,
      canManageCustomers,
      canCreateSales: can(role, 'sales.create'),
      canCorrectSales: can(role, 'sales.correct'),
      canReverseSales: can(role, 'sales.reverse'),
      canManageCredit: can(role, 'credit.manage'),
      canManageExpenses: can(role, 'expenses.create'),
      canViewReports: can(role, 'reports.view'),
      canViewAuditLogs: can(role, 'audit_logs.view'),
      canManageShops: can(role, 'shops.manage'),
      canManageUsers: can(role, 'users.manage'),
      canManageSettings: can(role, 'settings.manage'),
    }
  }, [role])
}
