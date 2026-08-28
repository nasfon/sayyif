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
import Edit from '@mui/icons-material/Edit'
import Search from '@mui/icons-material/Search'
import DataTable from '../../components/data/DataTable'
import { type TableFeatures } from '../../components/data/table'
import PageHeader from '../../components/ui/PageHeader'
import StatusBadge from '../../components/ui/StatusBadge'
import ConfirmationDialog from '../../components/ui/ConfirmationDialog'
import { useMobileNav } from '../../layouts/mobile/mobileNav'
import { getApiErrorMessage } from '../../lib/errors'
import { usePermissions } from '../../hooks/usePermissions'
import { useCreateShop, useShopsList, useUpdateShop } from '../../hooks/useShops'
import type { ShopRecord, ShopStatusFilter } from '../../types/shops'
import ShopFormDialog from './ShopFormDialog'
import {
  type CreateShopFormValues,
  type EditShopFormValues,
} from './shopsSchema'

const MobileShopsScreen = lazy(() => import('./MobileShopsScreen'))

type DialogState =
  | { type: 'create' }
  | { type: 'edit'; shop: ShopRecord }

type ConfirmState = { shop: ShopRecord; action: 'activate' | 'deactivate' } | null

export default function ShopsPage() {
  const mobileNav = useMobileNav()
  const isMobile = mobileNav.isMobile
  const permissions = usePermissions()
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 })
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<ShopStatusFilter>('')
  const [dialog, setDialog] = useState<DialogState | null>(null)
  const [confirm, setConfirm] = useState<ConfirmState>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const { data, isLoading } = useShopsList({
    page: pagination.pageIndex,
    pageSize: pagination.pageSize,
    search,
    status: statusFilter,
  })
  const createShop = useCreateShop()
  const updateShop = useUpdateShop()

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
        <MobileShopsScreen />
      </Suspense>
    )
  }

  if (!permissions.canManageShops) {
    return (
      <Box>
        <PageHeader title="Shops" />
        <Alert severity="error">You do not have permission to manage shops.</Alert>
      </Box>
    )
  }

  const closeDialog = () => {
    setDialog(null)
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
      closeDialog()
    } catch (error) {
      setSubmitError(getApiErrorMessage(error))
    }
  }

  const handleEdit = async (values: EditShopFormValues) => {
    if (dialog?.type !== 'edit') return
    setSubmitError(null)
    try {
      await updateShop.mutateAsync({
        shop_id: dialog.shop.id,
        name: values.name,
        phone: values.phone || undefined,
        email: values.email || undefined,
        address: values.address || undefined,
        logo_url: values.logo_url || undefined,
        receipt_footer: values.receipt_footer || undefined,
        is_active: values.is_active,
      })
      closeDialog()
    } catch (error) {
      setSubmitError(getApiErrorMessage(error))
    }
  }

  const handleFormSubmit = async (values: CreateShopFormValues | EditShopFormValues) => {
    if (dialog?.type === 'edit') {
      await handleEdit(values as EditShopFormValues)
    } else {
      await handleCreate(values as CreateShopFormValues)
    }
  }

  const handleToggleActive = async (target: NonNullable<ConfirmState>) => {
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

  const columns: ColumnDef<TableFeatures, ShopRecord, unknown>[] = [
    {
      accessorKey: 'name',
      header: 'Name',
      cell: (info) => (
        <Stack>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {info.getValue<string>()}
          </Typography>
          {info.row.original.email && (
            <Typography variant="caption" color="text.secondary">
              {info.row.original.email}
            </Typography>
          )}
        </Stack>
      ),
    },
    {
      accessorKey: 'phone',
      header: 'Phone',
      cell: (info) => <Typography variant="body2">{info.getValue<string | null>() ?? '—'}</Typography>,
    },
    {
      accessorKey: 'address',
      header: 'Address',
      cell: (info) => <Typography variant="body2">{info.getValue<string | null>() ?? '—'}</Typography>,
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
        return (
          <Stack direction="row" spacing={0.5}>
            <Button size="small" startIcon={<Edit />} onClick={() => setDialog({ type: 'edit', shop: row })}>
              Edit
            </Button>
            {row.is_active ? (
              <Button
                size="small"
                color="error"
                startIcon={<Block />}
                onClick={() => setConfirm({ shop: row, action: 'deactivate' })}
              >
                Disable
              </Button>
            ) : (
              <Button
                size="small"
                color="success"
                startIcon={<CheckCircle />}
                onClick={() => setConfirm({ shop: row, action: 'activate' })}
              >
                Enable
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
        title="Shops"
        subtitle="Manage business locations"
        actions={
          <Button variant="contained" startIcon={<Add />} onClick={() => setDialog({ type: 'create' })}>
            Add Shop
          </Button>
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
          value={statusFilter}
          onChange={(event: SelectChangeEvent<ShopStatusFilter>) => {
            setStatusFilter(event.target.value as ShopStatusFilter)
            setPagination((prev) => ({ ...prev, pageIndex: 0 }))
          }}
          displayEmpty
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="">All statuses</MenuItem>
          <MenuItem value="active">Active</MenuItem>
          <MenuItem value="inactive">Inactive</MenuItem>
        </Select>
      </Stack>

      {actionError && <Alert severity="error" sx={{ mb: 2 }}>{actionError}</Alert>}

      <DataTable<ShopRecord>
        columns={columns}
        data={data?.rows ?? []}
        getRowId={(row) => row.id}
        loading={isLoading}
        rowCount={data?.count ?? 0}
        pagination={pagination}
        onPaginationChange={setPagination}
        emptyTitle="No shops found"
        emptyDescription="Try adjusting your search or filters."
      />

      <ShopFormDialog
        key={dialog?.type === 'edit' ? dialog.shop.id : 'create'}
        open={dialog?.type === 'create' || dialog?.type === 'edit'}
        mode={dialog?.type === 'edit' ? 'edit' : 'create'}
        shop={dialog?.type === 'edit' ? dialog.shop : undefined}
        isSubmitting={createShop.isPending || updateShop.isPending}
        submitError={submitError}
        onSubmit={handleFormSubmit}
        onClose={closeDialog}
      />

      <ConfirmationDialog
        open={confirm !== null}
        title={confirm?.action === 'deactivate' ? 'Disable shop' : 'Enable shop'}
        message={
          confirm
            ? `Are you sure you want to ${confirm.action === 'deactivate' ? 'disable' : 'enable'} ${confirm.shop.name}? ${
                confirm.action === 'deactivate'
                  ? 'Users in this shop will lose access until it is re-enabled.'
                  : 'Users in this shop will regain access immediately.'
              }`
            : ''
        }
        confirmLabel={confirm?.action === 'deactivate' ? 'Disable' : 'Enable'}
        confirmColor={confirm?.action === 'deactivate' ? 'error' : 'success'}
        loading={updateShop.isPending}
        onConfirm={() => confirm && handleToggleActive(confirm)}
        onCancel={() => setConfirm(null)}
      />
    </Box>
  )
}