import { lazy, Suspense, useEffect, useState } from 'react'
import type { ColumnDef, PaginationState } from '@tanstack/react-table'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import InputAdornment from '@mui/material/InputAdornment'
import Loading from '../../components/feedback/Loading'
import MenuItem from '@mui/material/MenuItem'
import Select, { type SelectChangeEvent } from '@mui/material/Select'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import Add from '@mui/icons-material/Add'
import Block from '@mui/icons-material/Block'
import CheckCircle from '@mui/icons-material/CheckCircle'
import Delete from '@mui/icons-material/Delete'
import Edit from '@mui/icons-material/Edit'
import Key from '@mui/icons-material/Key'
import PersonAddAlt1 from '@mui/icons-material/PersonAddAlt1'
import Search from '@mui/icons-material/Search'
import DataTable from '../../components/data/DataTable'
import { type TableFeatures } from '../../components/data/table'
import PageHeader from '../../components/ui/PageHeader'
import StatusBadge from '../../components/ui/StatusBadge'
import ConfirmationDialog from '../../components/ui/ConfirmationDialog'
import { useMobileNav } from '../../layouts/mobile/mobileNav'
import { getApiErrorMessage } from '../../lib/errors'
import { useAuth } from '../../hooks/useAuth'
import { usePermissions } from '../../hooks/usePermissions'
import {
  useCreateUser,
  useDeleteUser,
  useOnboardUser,
  useResetPassword,
  useRoles,
  useShops,
  useUnassignedUsers,
  useUpdateUser,
  useUsers,
} from '../../hooks/useUsers'
import type { RoleName } from '../../types/auth'
import type { UserRecord } from '../../types/users'
import UserFormDialog from './UserFormDialog'
import OnboardUserDialog from './OnboardUserDialog'
import ResetPasswordDialog from './ResetPasswordDialog'
import {
  type CreateUserFormValues,
  type EditUserFormValues,
  type OnboardUserFormValues,
  type ResetPasswordFormValues,
} from './userSchema'

const MobileUsersScreen = lazy(() => import('./MobileUsersScreen'))

const roleColors: Record<RoleName, 'primary' | 'secondary' | 'error'> = {
  super_admin: 'error',
  shop_admin: 'primary',
  cashier: 'secondary',
}

type DialogState =
  | { type: 'create' }
  | { type: 'edit'; user: UserRecord }
  | { type: 'onboard' }
  | { type: 'reset'; user: UserRecord }

type ConfirmState = { user: UserRecord; action: 'activate' | 'deactivate' | 'delete' } | null

export default function UsersPage() {
  const mobileNav = useMobileNav()
  const isMobile = mobileNav.isMobile
  const permissions = usePermissions()
  const { user } = useAuth()
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 })
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<RoleName | ''>('')
  const [dialog, setDialog] = useState<DialogState | null>(null)
  const [confirm, setConfirm] = useState<ConfirmState>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const { data, isLoading } = useUsers({
    page: pagination.pageIndex,
    pageSize: pagination.pageSize,
    search,
    role: roleFilter,
  })
  const unassignedQuery = useUnassignedUsers()
  const rolesQuery = useRoles()
  const shopsQuery = useShops()
  const createUser = useCreateUser()
  const updateUser = useUpdateUser()
  const onboardUser = useOnboardUser()
  const resetPassword = useResetPassword()
  const deleteUser = useDeleteUser()

  const isSuperAdmin = permissions.isSuperAdmin
  const isAdmin = permissions.isAdmin
  const currentUserId = user?.id
  const assignableRoles = (rolesQuery.data ?? []).filter((roleOption) => {
    if (roleOption.name === 'super_admin') return false
    if (!isSuperAdmin && roleOption.name === 'shop_admin') return false
    return true
  })
  const shops = shopsQuery.data ?? []
  const shopName = (shopId: string | null) => shops.find((shop) => shop.id === shopId)?.name ?? '—'

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim())
      setPagination((prev) => ({ ...prev, pageIndex: 0 }))
    }, 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  if (isMobile) {
    return (
      <Suspense fallback={<Loading />}>
        <MobileUsersScreen />
      </Suspense>
    )
  }

  if (!isAdmin) {
    return (
      <Box>
        <PageHeader title="Users" />
        <Alert severity="error">You do not have permission to manage users.</Alert>
      </Box>
    )
  }

  const closeDialog = () => {
    setDialog(null)
    setSubmitError(null)
  }

  const handleCreate = async (values: CreateUserFormValues) => {
    setSubmitError(null)
    try {
      await createUser.mutateAsync({
        email: values.email,
        password: values.password,
        full_name: values.full_name,
        phone: values.phone || undefined,
        role: values.role,
        shop_id: values.shop_id || null,
      })
      closeDialog()
    } catch (error) {
      setSubmitError(getApiErrorMessage(error))
    }
  }

  const handleEdit = async (values: EditUserFormValues) => {
    if (dialog?.type !== 'edit') return
    setSubmitError(null)
    try {
      await updateUser.mutateAsync({
        user_id: dialog.user.id,
        full_name: values.full_name,
        phone: values.phone || undefined,
        role: values.role,
        shop_id: values.shop_id || null,
        is_active: values.is_active,
      })
      closeDialog()
    } catch (error) {
      setSubmitError(getApiErrorMessage(error))
    }
  }

  const handleOnboard = async (values: OnboardUserFormValues) => {
    setSubmitError(null)
    try {
      await onboardUser.mutateAsync({
        user_id: values.user_id,
        full_name: values.full_name,
        phone: values.phone || undefined,
        role: values.role,
        shop_id: values.shop_id || null,
      })
      closeDialog()
    } catch (error) {
      setSubmitError(getApiErrorMessage(error))
    }
  }

  const handleResetPassword = async (values: ResetPasswordFormValues) => {
    if (dialog?.type !== 'reset') return
    setSubmitError(null)
    try {
      await resetPassword.mutateAsync({ userId: dialog.user.id, newPassword: values.new_password })
      closeDialog()
    } catch (error) {
      setSubmitError(getApiErrorMessage(error))
    }
  }

  const handleFormSubmit = async (values: CreateUserFormValues | EditUserFormValues) => {
    if (dialog?.type === 'edit') {
      await handleEdit(values as EditUserFormValues)
    } else {
      await handleCreate(values as CreateUserFormValues)
    }
  }

  const handleConfirmAction = async (target: NonNullable<ConfirmState>) => {
    setActionError(null)
    try {
      if (target.action === 'delete') {
        await deleteUser.mutateAsync(target.user.id)
      } else {
        await updateUser.mutateAsync({
          user_id: target.user.id,
          full_name: target.user.full_name,
          phone: target.user.phone ?? undefined,
          role: target.user.role,
          shop_id: target.user.shop_id,
          is_active: target.action === 'activate',
        })
      }
      setConfirm(null)
    } catch (error) {
      setActionError(getApiErrorMessage(error))
      setConfirm(null)
    }
  }

  const columns: ColumnDef<TableFeatures, UserRecord, unknown>[] = [
    {
      accessorKey: 'full_name',
      header: 'Name',
      cell: (info) => (
        <Stack>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {info.getValue<string>()}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {info.row.original.email}
          </Typography>
        </Stack>
      ),
    },
    {
      accessorKey: 'role',
      header: 'Role',
      cell: (info) => (
        <StatusBadge label={info.getValue<RoleName>().replace('_', ' ')} color={roleColors[info.getValue<RoleName>()]} />
      ),
    },
    {
      accessorKey: 'shop_id',
      header: 'Shop',
      cell: (info) => <Typography variant="body2">{shopName(info.getValue<string | null>())}</Typography>,
    },
    {
      accessorKey: 'is_active',
      header: 'Status',
      cell: (info) => (
        <StatusBadge label={info.getValue<boolean>() ? 'Active' : 'Inactive'} color={info.getValue<boolean>() ? 'success' : 'default'} />
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: (info) => {
        const row = info.row.original
        const canDelete = row.role !== 'super_admin' && row.id !== currentUserId
        return (
          <Stack direction="row" spacing={0.5}>
            <Button size="small" startIcon={<Edit />} onClick={() => setDialog({ type: 'edit', user: row })}>
              Edit
            </Button>
            <Button size="small" startIcon={<Key />} onClick={() => setDialog({ type: 'reset', user: row })}>
              Password
            </Button>
            {row.is_active ? (
              <Button
                size="small"
                color="error"
                startIcon={<Block />}
                onClick={() => setConfirm({ user: row, action: 'deactivate' })}
              >
                Deactivate
              </Button>
            ) : (
              <Button
                size="small"
                color="success"
                startIcon={<CheckCircle />}
                onClick={() => setConfirm({ user: row, action: 'activate' })}
              >
                Activate
              </Button>
            )}
            {canDelete && (
              <Button
                size="small"
                color="error"
                startIcon={<Delete />}
                onClick={() => setConfirm({ user: row, action: 'delete' })}
              >
                Delete
              </Button>
            )}
          </Stack>
        )
      },
    },
  ]

  return (
    <Box>
      <PageHeader
        title="Users"
        subtitle="Manage staff accounts, roles, and shop assignment"
        actions={
          <>
            <Button
              variant="outlined"
              startIcon={<PersonAddAlt1 />}
              onClick={() => setDialog({ type: 'onboard' })}
            >
              Onboard
            </Button>
            <Button variant="contained" startIcon={<Add />} onClick={() => setDialog({ type: 'create' })}>
              Add User
            </Button>
          </>
        }
      />

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
        <TextField
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder="Search by name or email"
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            },
          }}
          sx={{ flex: 1, minWidth: 240 }}
        />
        <Select
          value={roleFilter}
          onChange={(event: SelectChangeEvent<RoleName | ''>) => {
            setRoleFilter(event.target.value as RoleName | '')
            setPagination((prev) => ({ ...prev, pageIndex: 0 }))
          }}
          displayEmpty
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="">All roles</MenuItem>
          <MenuItem value="super_admin">Super Admin</MenuItem>
          <MenuItem value="shop_admin">Shop Admin</MenuItem>
          <MenuItem value="cashier">Cashier</MenuItem>
        </Select>
      </Stack>

      {actionError && <Alert severity="error" sx={{ mb: 2 }}>{actionError}</Alert>}

      <DataTable<UserRecord>
        columns={columns}
        data={data?.rows ?? []}
        getRowId={(row) => row.id}
        loading={isLoading}
        rowCount={data?.count ?? 0}
        pagination={pagination}
        onPaginationChange={setPagination}
        emptyTitle="No users found"
        emptyDescription="Try adjusting your search or filters."
      />

      <UserFormDialog
        key={dialog?.type === 'edit' ? dialog.user.id : 'create'}
        open={dialog?.type === 'create' || dialog?.type === 'edit'}
        mode={dialog?.type === 'edit' ? 'edit' : 'create'}
        user={dialog?.type === 'edit' ? dialog.user : undefined}
        assignableRoles={assignableRoles}
        shops={shops}
        isSubmitting={createUser.isPending || updateUser.isPending}
        submitError={submitError}
        onSubmit={handleFormSubmit}
        onClose={closeDialog}
      />

      <OnboardUserDialog
        open={dialog?.type === 'onboard'}
        candidates={unassignedQuery.data ?? []}
        assignableRoles={assignableRoles}
        shops={shops}
        isSubmitting={onboardUser.isPending}
        submitError={submitError}
        onSubmit={handleOnboard}
        onClose={closeDialog}
      />

      <ResetPasswordDialog
        open={dialog?.type === 'reset'}
        userName={dialog?.type === 'reset' ? dialog.user.full_name : ''}
        isSubmitting={resetPassword.isPending}
        submitError={submitError}
        onSubmit={handleResetPassword}
        onClose={closeDialog}
      />

      <ConfirmationDialog
        open={confirm !== null}
        title={
          confirm?.action === 'delete'
            ? 'Delete user'
            : confirm?.action === 'deactivate'
            ? 'Deactivate user'
            : 'Activate user'
        }
        message={
          confirm
            ? confirm.action === 'delete'
              ? `Are you sure you want to delete ${confirm.user.full_name}? This cannot be undone.`
              : `Are you sure you want to ${confirm.action} ${confirm.user.full_name}? ${
                  confirm.action === 'deactivate'
                    ? 'They will lose access to the app until reactivated.'
                    : 'They will regain access immediately.'
                }`
            : ''
        }
        confirmLabel={
          confirm?.action === 'delete'
            ? 'Delete'
            : confirm?.action === 'deactivate'
            ? 'Deactivate'
            : 'Activate'
        }
        confirmColor={
          confirm?.action === 'delete' || confirm?.action === 'deactivate' ? 'error' : 'success'
        }
        loading={updateUser.isPending || deleteUser.isPending}
        onConfirm={() => confirm && handleConfirmAction(confirm)}
        onCancel={() => setConfirm(null)}
      />
    </Box>
  )
}