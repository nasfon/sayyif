import { useEffect, useMemo, useState } from 'react'
import Add from '@mui/icons-material/Add'
import Block from '@mui/icons-material/Block'
import CheckCircle from '@mui/icons-material/CheckCircle'
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
import { usePermissions } from '../../hooks/usePermissions'
import { useInfiniteScroll } from '../../hooks/useInfiniteScroll'
import { useMobileNav } from '../../layouts/mobile/mobileNav'
import { useCreateShop, useInfiniteShopsList, useUpdateShop } from '../../hooks/useShops'
import { getApiErrorMessage } from '../../lib/errors'
import type { ShopRecord, ShopStatusFilter } from '../../types/shops'
import MobileShopFormSheet from './mobile/MobileShopFormSheet'
import type { CreateShopFormValues, EditShopFormValues } from './shopsSchema'

type FormState = { mode: 'create' } | { mode: 'edit'; shop: ShopRecord } | null
type ConfirmState = { shop: ShopRecord; action: 'activate' | 'deactivate' } | null

export default function MobileShopsScreen() {
  const permissions = usePermissions()
  const mobileNav = useMobileNav()
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<ShopStatusFilter>('')
  const [selected, setSelected] = useState<ShopRecord | null>(null)
  const [form, setForm] = useState<FormState>(null)
  const [confirm, setConfirm] = useState<ConfirmState>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const canManage = permissions.canManageShops

  const query = useInfiniteShopsList({ search, status: statusFilter })
  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage, refetch } = query
  const rows = useMemo(() => (data?.pages ?? []).flatMap((page) => page.rows), [data])

  const createShop = useCreateShop()
  const updateShop = useUpdateShop()

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
        <Alert severity="error">You do not have permission to manage shops.</Alert>
      </Box>
    )
  }

  const closeForm = () => {
    setForm(null)
    setSubmitError(null)
  }

  const handleCreate = async (values: CreateShopFormValues) => {
    setSubmitError(null)
    try {
      await createShop.mutateAsync({
        name: values.name,
        phone: values.phone || undefined,
        email: values.email || undefined,
        address: values.address || undefined,
        logo_url: values.logo_url || undefined,
        receipt_footer: values.receipt_footer || undefined,
      })
      closeForm()
    } catch (error) {
      setSubmitError(getApiErrorMessage(error))
    }
  }

  const handleEdit = async (values: EditShopFormValues) => {
    if (form?.mode !== 'edit') return
    setSubmitError(null)
    try {
      await updateShop.mutateAsync({
        shop_id: form.shop.id,
        name: values.name,
        phone: values.phone || undefined,
        email: values.email || undefined,
        address: values.address || undefined,
        logo_url: values.logo_url || undefined,
        receipt_footer: values.receipt_footer || undefined,
        is_active: values.is_active,
      })
      closeForm()
    } catch (error) {
      setSubmitError(getApiErrorMessage(error))
    }
  }

  const handleFormSubmit = (values: CreateShopFormValues | EditShopFormValues) => {
    if (form?.mode === 'edit') {
      void handleEdit(values as EditShopFormValues)
    } else {
      void handleCreate(values as CreateShopFormValues)
    }
  }

  const handleConfirmAction = async (target: NonNullable<ConfirmState>) => {
    setActionError(null)
    try {
      await updateShop.mutateAsync({
        shop_id: target.shop.id,
        name: target.shop.name,
        phone: target.shop.phone ?? undefined,
        email: target.shop.email ?? undefined,
        address: target.shop.address ?? undefined,
        logo_url: target.shop.logo_url ?? undefined,
        receipt_footer: target.shop.receipt_footer ?? undefined,
        is_active: target.action === 'activate',
      })
      setConfirm(null)
    } catch (error) {
      setActionError(getApiErrorMessage(error))
      setConfirm(null)
    }
  }

  return (
    <Box>
      <Box sx={{ mb: 1.5 }}>
        <SearchBar value={searchInput} onChange={setSearchInput} placeholder="Search by name or email" />
      </Box>

      <Select
        value={statusFilter}
        onChange={(event: SelectChangeEvent<ShopStatusFilter>) =>
          setStatusFilter(event.target.value as ShopStatusFilter)
        }
        displayEmpty
        size="small"
        fullWidth
        sx={{ mb: 1.5 }}
      >
        <MenuItem value="">All statuses</MenuItem>
        <MenuItem value="active">Active</MenuItem>
        <MenuItem value="inactive">Inactive</MenuItem>
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
          <Typography variant="h6">No shops found</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Try adjusting your search or filters.
          </Typography>
        </Box>
      ) : (
        <Box>
          {rows.map((shop) => (
            <MobileRow
              key={shop.id}
              accent={shop.is_active ? 'success' : 'default'}
              primary={shop.name}
              secondary={shop.email ?? shop.phone ?? '—'}
              trailing={
                <StatusBadge
                  label={shop.is_active ? 'Active' : 'Inactive'}
                  color={shop.is_active ? 'success' : 'default'}
                />
              }
              onClick={() => setSelected(shop)}
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
        title={selected?.name}
      >
        {selected && (
          <ShopDetailSheet
            shop={selected}
            updating={updateShop.isPending}
            onEdit={() => setForm({ mode: 'edit', shop: selected })}
            onActivate={() => setConfirm({ shop: selected, action: 'activate' })}
            onDeactivate={() => setConfirm({ shop: selected, action: 'deactivate' })}
          />
        )}
      </BottomSheet>

      {form && (
        <MobileShopFormSheet
          open={form !== null}
          mode={form.mode}
          shop={form.mode === 'edit' ? form.shop : undefined}
          isSubmitting={createShop.isPending || updateShop.isPending}
          submitError={submitError}
          onSubmit={handleFormSubmit}
          onClose={closeForm}
        />
      )}

      <ConfirmationDialog
        open={confirm !== null}
        title={confirm?.action === 'deactivate' ? 'Disable shop' : 'Enable shop'}
        message={
          confirm
            ? `Are you sure you want to ${confirm.action === 'deactivate' ? 'disable' : 'enable'} ${
                confirm.shop.name
              }? ${
                confirm.action === 'deactivate'
                  ? 'Users in this shop will lose access until it is re-enabled.'
                  : 'Users in this shop will regain access immediately.'
              }`
            : ''
        }
        confirmLabel={confirm?.action === 'deactivate' ? 'Disable' : 'Enable'}
        confirmColor={confirm?.action === 'deactivate' ? 'error' : 'success'}
        loading={updateShop.isPending}
        onConfirm={() => confirm && handleConfirmAction(confirm)}
        onCancel={() => setConfirm(null)}
      />
    </Box>
  )
}

interface ShopDetailSheetProps {
  shop: ShopRecord
  updating: boolean
  onEdit: () => void
  onActivate: () => void
  onDeactivate: () => void
}

function ShopDetailSheet({
  shop,
  updating,
  onEdit,
  onActivate,
  onDeactivate,
}: ShopDetailSheetProps) {
  return (
    <Box>
      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Typography variant="caption" color="text.secondary">
          Email
        </Typography>
        <Typography variant="body1" sx={{ fontWeight: 600, mb: 1 }}>
          {shop.email ?? '—'}
        </Typography>
        <Stack direction="row" spacing={3}>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Phone
            </Typography>
            <Typography variant="body2">{shop.phone ?? '—'}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Status
            </Typography>
            <Typography variant="body2">{shop.is_active ? 'Active' : 'Inactive'}</Typography>
          </Box>
        </Stack>
        {shop.address && (
          <Box sx={{ mt: 1 }}>
            <Typography variant="caption" color="text.secondary">
              Address
            </Typography>
            <Typography variant="body2">{shop.address}</Typography>
          </Box>
        )}
      </Paper>

      <Stack spacing={1.5}>
        <Button fullWidth variant="contained" startIcon={<Edit />} onClick={onEdit}>
          Edit
        </Button>
        {shop.is_active ? (
          <Button
            fullWidth
            variant="outlined"
            color="error"
            startIcon={<Block />}
            disabled={updating}
            onClick={onDeactivate}
          >
            Disable
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
            Enable
          </Button>
        )}
      </Stack>

      <Divider sx={{ my: 2 }} />
      {shop.receipt_footer && (
        <Typography variant="caption" color="text.secondary">
          Receipt footer: {shop.receipt_footer}
        </Typography>
      )}
    </Box>
  )
}
