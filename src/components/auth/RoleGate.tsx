import type { ReactNode } from 'react'
import type { Permission } from '../../lib/permissions'
import { can, canAny } from '../../lib/permissions'
import { useAuth } from '../../hooks/useAuth'
import type { RoleName } from '../../types/auth'

interface RoleGateProps {
  permission?: Permission
  permissions?: Permission[]
  role?: RoleName | RoleName[]
  fallback?: ReactNode
  children: ReactNode
}

function normalizeRoles(role: RoleName | RoleName[] | undefined): RoleName[] | undefined {
  if (role === undefined) return undefined
  return Array.isArray(role) ? role : [role]
}

export default function RoleGate({
  permission,
  permissions,
  role,
  fallback = null,
  children,
}: RoleGateProps) {
  const { profile } = useAuth()
  const userRole = profile?.role ?? null

  const allowedByRole = !role || normalizeRoles(role)?.includes(userRole as RoleName)
  const allowedByPermission =
    !permission || can(userRole, permission)
  const allowedByPermissions =
    !permissions || permissions.length === 0 || canAny(userRole, permissions)

  if (allowedByRole && allowedByPermission && allowedByPermissions) {
    return <>{children}</>
  }

  return <>{fallback}</>
}
