import { useEffect, useMemo, useState } from 'react'
import Add from '@mui/icons-material/Add'
import Block from '@mui/icons-material/Block'
import CheckCircle from '@mui/icons-material/CheckCircle'
import Delete from '@mui/icons-material/Delete'
import Edit from '@mui/icons-material/Edit'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import MenuItem from '@mui/material/MenuItem'
import Paper from '@mui/material/Paper'
import Select, { type SelectChangeEvent } from '@mui/material/Select'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { BottomSheet, MobileRow, SearchBar } from '../../components/mobile'
import StatusBadge from '../../components/ui/StatusBadge'
import { ConfirmationDialog } from '../../components/ui'
import { useAuth } from '../../hooks/useAuth'
import { usePermissions } from '../../hooks/usePermissions'
import { useInfiniteScroll } from '../../hooks/useInfiniteScroll'
import { useMobileNav } from '../../layouts/mobile/mobileNav'
import {
  useCreateUser,
  useDeleteUser,
  useInfiniteUsersList,
  useRoles,
  useShops,
  useUpdateUser,
} from '../../hooks/useUsers'
import { getApiErrorMessage } from '../../lib/errors'
import type { RoleName } from '../../types/auth'
import type { UserRecord } from '../../types/users'
import MobileUserFormSheet from './mobile/MobileUserFormSheet'
import type { CreateUserFormValues, EditUserFormValues } from './userSchema'

const roleColors: Record<RoleName, 'primary' | 'secondary' | 'error'> = {
  super_admin: 'error',
  shop_admin: 'primary',
  cashier: 'secondary',
}

type FormState = { mode: 'create' } | { mode: 'edit'; user: UserRecord } | null
type ConfirmState = { user: UserRecord; action: 'activate' | 'deactivate' | 'delete' } | null

export default function MobileUsersScreen() {
  const { user } = useAuth()
  const permissions = usePermissions()
  const mobileNav = useMobileNav()
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<RoleName | ''>('')
  const [selected, setSelected] = useState<UserRecord | null>(null)
  const [form, setForm] = useState<FormState>(null)
  const [confirm, setConfirm] = useState<ConfirmState>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const canManage = permissions.canManageUsers
  const isSuperAdmin = permissions.isSuperAdmin
  const currentUserId = user?.id

  const rolesQuery = useRoles()
  const shopsQuery = useShops()
  const shops = shopsQuery.data ?? []

  const assignableRoles = useMemo(
    () =>
      (rolesQuery.data ?? []).filter((roleOption) => {
        if (roleOption.name === 'super_admin') return false
        if (!isSuperAdmin && roleOption.name === 'shop_admin') return false
        return true
      }),
    [rolesQuery.data, isSuperAdmin],
  )

  const query = useInfiniteUsersList({ search, role: roleFilter })
  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage, refetch } = query
  const rows = useMemo(() => (data?.pages ?? []).flatMap((page) => page.rows), [data])

  const createUser = useCreateUser()
  const updateUser = useUpdateUser()
  const deleteUser = useDeleteUser()

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  useEffect(() => {
    mobileNav.setRefresh(() => refetch())
    return () => mobileNav.setRefresh(null)
  }, [mobileNav, refetch])

  useEffect(() => {
    if (!canManage) {
      mobileNav.setFab(null)
      return
    }
    mobileNav.setFab({ icon: Add, label: 'Add', onClick: () => setForm({ mode: 'create' }) })
    return () => mobileNav.setFab(null)
  }, [mobileNav, canManage])

  const sentinelRef = useInfiniteScroll(
    () => {
      if (hasNextPage && !isFetchingNextPage) fetchNextPage()
    },
    hasNextPage && !isFetchingNextPage,
  )

  if (!canManage) {
    return (
      <Box>
        <Alert severity="error">You do not have permission to manage users.</Alert>
      </Box>
    )
  }

  const closeForm = () => {
    setForm(null)
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
      closeForm()
    } catch (error) {
      setSubmitError(getApiErrorMessage(error))
    }
  }

  const handleEdit = async (values: EditUserFormValues) => {
    if (form?.mode !== 'edit') return
    setSubmitError(null)
    try {
      await updateUser.mutateAsync({
        user_id: form.user.id,
        full_name: values.full_name,
        phone: values.phone || undefined,
        role: values.role,
        shop_id: values.shop_id || null,
        is_active: values.is_active,
      })
      closeForm()
    } catch (error) {
      setSubmitError(getApiErrorMessage(error))
    }
  }

  const handleFormSubmit = (values: CreateUserFormValues | EditUserFormValues) => {
    if (form?.mode === 'edit') {
      void handleEdit(values as EditUserFormValues)
    } else {
      void handleCreate(values as CreateUserFormValues)
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

  const shopName = (shopId: string | null) => shops.find((shop) => shop.id === shopId)?.name ?? '—'

  return (
    <Box>
      <Box sx={{ mb: 1.5 }}>
        <SearchBar value={searchInput} onChange={setSearchInput} placeholder="Search by name or email" />
      </Box>

      <Select
        value={roleFilter}
        onChange={(event: SelectChangeEvent<RoleName | ''>) => setRoleFilter(event.target.value as RoleName | '')}
        displayEmpty
        size="small"
        fullWidth
        sx={{ mb: 1.5 }}
      >
        <MenuItem value="">All roles</MenuItem>
        <MenuItem value="super_admin">Super Admin</MenuItem>
        <MenuItem value="shop_admin">Shop Admin</MenuItem>
        <MenuItem value="cashier">Cashier</MenuItem>
      </Select>

      {actionError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {actionError}
        </Alert>
      )}

      {isLoading ? (
        <Stack spacing={1.5}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Paper key={i} variant="outlined" sx={{ px: 2, py: 1.5 }}>
              <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                <Box sx={{ flex: 1 }}>
                  <Box sx={{ width: '60%', height: 18, bgcolor: 'action.hover', borderRadius: 1 }} />
                  <Box sx={{ width: '40%', height: 14, bgcolor: 'action.hover', borderRadius: 1, mt: 0.5 }} />
                </Box>
                <Box sx={{ width: 56, height: 20, bgcolor: 'action.hover', borderRadius: 1 }} />
              </Stack>
            </Paper>
          ))}
        </Stack>
      ) : rows.length === 0 ? (
        <Box sx={{ py: 8, textAlign: 'center' }}>
          <Typography variant="h6">No users found</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Try adjusting your search or filters.
          </Typography>
        </Box>
      ) : (
        <Box>
          {rows.map((u) => (
            <MobileRow
              key={u.id}
              accent={u.is_active ? 'success' : 'default'}
              primary={u.full_name}
              secondary={u.email}
              trailing={
                <Stack sx={{ alignItems: 'flex-end' }} spacing={0.5}>
                  <StatusBadge label={u.role.replace('_', ' ')} color={roleColors[u.role]} />
                  <StatusBadge label={u.is_active ? 'Active' : 'Inactive'} color={u.is_active ? 'success' : 'default'} />
                </Stack>
              }
              onClick={() => setSelected(u)}
            />
          ))}
          <Box ref={sentinelRef} sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
            {isFetchingNextPage ? <CircularProgress size={24} /> : null}
          </Box>
        </Box>
      )}

      <BottomSheet
        open={selected !== null}
        onClose={() => setSelected(null)}
        title={selected?.full_name}
      >
        {selected && (
          <UserDetailSheet
            user={selected}
            shopName={shopName(selected.shop_id)}
            canDelete={selected.role !== 'super_admin' && selected.id !== currentUserId}
            updating={updateUser.isPending}
            deleting={deleteUser.isPending}
            onEdit={() => setForm({ mode: 'edit', user: selected })}
            onActivate={() => setConfirm({ user: selected, action: 'activate' })}
            onDeactivate={() => setConfirm({ user: selected, action: 'deactivate' })}
            onDelete={() => setConfirm({ user: selected, action: 'delete' })}
          />
        )}
      </BottomSheet>

      {form && (
        <MobileUserFormSheet
          open={form !== null}
          mode={form.mode}
          user={form.mode === 'edit' ? form.user : undefined}
          assignableRoles={assignableRoles}
          shops={shops}
          isSubmitting={createUser.isPending || updateUser.isPending}
          submitError={submitError}
          onSubmit={handleFormSubmit}
          onClose={closeForm}
        />
      )}

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
        confirmColor={confirm?.action === 'delete' || confirm?.action === 'deactivate' ? 'error' : 'success'}
        loading={updateUser.isPending || deleteUser.isPending}
        onConfirm={() => confirm && handleConfirmAction(confirm)}
        onCancel={() => setConfirm(null)}
      />
    </Box>
  )
}

interface UserDetailSheetProps {
  user: UserRecord
  shopName: string
  canDelete: boolean
  updating: boolean
  deleting: boolean
  onEdit: () => void
  onActivate: () => void
  onDeactivate: () => void
  onDelete: () => void
}

function UserDetailSheet({
  user,
  shopName,
  canDelete,
  updating,
  deleting,
  onEdit,
  onActivate,
  onDeactivate,
  onDelete,
}: UserDetailSheetProps) {
  return (
    <Box>
      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Typography variant="caption" color="text.secondary">
          Email
        </Typography>
        <Typography variant="body1" sx={{ fontWeight: 600, mb: 1 }}>
          {user.email}
        </Typography>
        <Stack direction="row" spacing={3}>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Phone
            </Typography>
            <Typography variant="body2">{user.phone ?? '—'}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Shop
            </Typography>
            <Typography variant="body2">{shopName}</Typography>
          </Box>
        </Stack>
      </Paper>

      <Stack spacing={1.5}>
        <Button fullWidth variant="contained" startIcon={<Edit />} onClick={onEdit}>
          Edit
        </Button>
        {user.is_active ? (
          <Button
            fullWidth
            variant="outlined"
            color="error"
            startIcon={<Block />}
            disabled={updating}
            onClick={onDeactivate}
          >
            Deactivate
          </Button>
        ) : (
          <Button
            fullWidth
            variant="outlined"
            color="success"
            startIcon={<CheckCircle />}
            disabled={updating}
            onClick={onActivate}
          >
            Activate
          </Button>
        )}
        {canDelete && (
          <Button
            fullWidth
            variant="text"
            color="error"
            startIcon={<Delete />}
            disabled={deleting}
            onClick={onDelete}
          >
            Delete
          </Button>
        )}
      </Stack>

      <Divider sx={{ my: 2 }} />
      <Typography variant="caption" color="text.secondary">
        Role: {user.role.replace('_', ' ')} · {user.is_active ? 'Active' : 'Inactive'}
      </Typography>
    </Box>
  )
}
