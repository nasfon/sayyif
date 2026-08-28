import { lazy, Suspense, useEffect, useState } from 'react'
import { useMobileNav } from '../../layouts/mobile/mobileNav'
import type { ColumnDef, PaginationState } from '@tanstack/react-table'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import InputAdornment from '@mui/material/InputAdornment'
import MenuItem from '@mui/material/MenuItem'
import Select, { type SelectChangeEvent } from '@mui/material/Select'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import Loading from '../../components/feedback/Loading'
import Add from '@mui/icons-material/Add'
import DeleteOutlined from '@mui/icons-material/DeleteOutlined'
import Edit from '@mui/icons-material/Edit'
import Search from '@mui/icons-material/Search'
import Visibility from '@mui/icons-material/Visibility'
import DataTable from '../../components/data/DataTable'
import { type TableFeatures } from '../../components/data/table'
import PageHeader from '../../components/ui/PageHeader'
import ConfirmationDialog from '../../components/ui/ConfirmationDialog'
import { getApiErrorMessage } from '../../lib/errors'
import { formatCurrency } from '../../lib/utils'
import { useAuth } from '../../hooks/useAuth'
import { usePermissions } from '../../hooks/usePermissions'
import { useShops } from '../../hooks/useShops'
import {
  useCreateCustomer,
  useCustomersList,
  useCustomerPurchaseTotals,
  useDeleteCustomer,
  useUpdateCustomer,
} from '../../hooks/useCustomers'
import type { CustomerRecord } from '../../types/customers'
import CustomerFormDialog from './CustomerFormDialog'
import CustomerProfileDialog from './CustomerProfileDialog'
import {
  type CreateCustomerFormValues,
  type EditCustomerFormValues,
} from './customersSchema'

const MobileCustomersScreen = lazy(() => import('./MobileCustomersScreen'))

type DialogState =
  | { type: 'create' }
  | { type: 'edit'; customer: CustomerRecord }

type ConfirmState = { customer: CustomerRecord } | null

export default function CustomersPage() {
  const mobileNav = useMobileNav()
  const isMobile = mobileNav.isMobile
  const { profile } = useAuth()
  const permissions = usePermissions()
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 })
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [shopFilter, setShopFilter] = useState('')
  const [dialog, setDialog] = useState<DialogState | null>(null)
  const [confirm, setConfirm] = useState<ConfirmState>(null)
  const [customerProfile, setCustomerProfile] = useState<CustomerRecord | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const isSuperAdmin = permissions.isSuperAdmin
  const isAdmin = permissions.canManageCustomers
  const defaultShopId = isSuperAdmin ? '' : (profile?.shop_id ?? '')

  const customersQuery = useCustomersList({
    page: pagination.pageIndex,
    pageSize: pagination.pageSize,
    search,
    shopId: isSuperAdmin ? shopFilter : defaultShopId,
  })
  const { data, isLoading, refetch: refetchCustomers } = customersQuery

  useEffect(() => {
    if (isMobile) return
    mobileNav.setRefresh(() => refetchCustomers())
    return () => mobileNav.setRefresh(null)
  }, [mobileNav, refetchCustomers, isMobile])
  const shopsQuery = useShops()
  const shops = shopsQuery.data ?? []
  const createCustomer = useCreateCustomer()
  const updateCustomer = useUpdateCustomer()
  const deleteCustomer = useDeleteCustomer()
  const shopName = (shopId: string) => shops.find((shop) => shop.id === shopId)?.name ?? '—'

  const purchaseTotalsQuery = useCustomerPurchaseTotals(isSuperAdmin ? shopFilter : defaultShopId)
  const purchaseTotals = new Map(
    (purchaseTotalsQuery.data ?? []).map((total) => [total.customer_id, total]),
  )

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim())
      setPagination((prev) => ({ ...prev, pageIndex: 0 }))
    }, 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  const closeDialog = () => {
    setDialog(null)
    setSubmitError(null)
  }

  const handleCreate = async (values: CreateCustomerFormValues) => {
    setSubmitError(null)
    try {
      await createCustomer.mutateAsync({
        shop_id: values.shop_id,
        full_name: values.full_name,
        phone: values.phone,
        email: values.email || undefined,
        address: values.address || undefined,
      })
      closeDialog()
    } catch (error) {
      setSubmitError(getApiErrorMessage(error))
    }
  }

  const handleEdit = async (values: EditCustomerFormValues) => {
    if (dialog?.type !== 'edit') return
    setSubmitError(null)
    try {
      await updateCustomer.mutateAsync({
        customer_id: dialog.customer.id,
        full_name: values.full_name,
        phone: values.phone,
        email: values.email || undefined,
        address: values.address || undefined,
      })
      closeDialog()
    } catch (error) {
      setSubmitError(getApiErrorMessage(error))
    }
  }

  const handleFormSubmit = async (values: CreateCustomerFormValues | EditCustomerFormValues) => {
    if (dialog?.type === 'edit') {
      await handleEdit(values as EditCustomerFormValues)
    } else {
      await handleCreate(values as CreateCustomerFormValues)
    }
  }

  const handleDelete = async (target: NonNullable<ConfirmState>) => {
    setActionError(null)
    try {
      await deleteCustomer.mutateAsync(target.customer.id)
      setConfirm(null)
    } catch (error) {
      setActionError(getApiErrorMessage(error))
      setConfirm(null)
    }
  }

  const columns: ColumnDef<TableFeatures, CustomerRecord, unknown>[] = []

  if (isSuperAdmin) {
    columns.push({
      accessorKey: 'shop_id',
      header: 'Shop',
      cell: (info) => <Typography variant="body2">{shopName(info.getValue<string>())}</Typography>,
    })
  }

  columns.push(
    {
      accessorKey: 'full_name',
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
      cell: (info) => <Typography variant="body2">{info.getValue<string>()}</Typography>,
    },
    {
      id: 'total_purchases',
      header: 'Total Purchases',
      cell: (info) => {
        const total = purchaseTotals.get(info.row.original.id)
        return (
          <Stack>
            <Typography variant="body2">{total ? total.purchase_count : 0} purchases</Typography>
            <Typography variant="caption" color="text.secondary">
              {formatCurrency(total ? total.total_spent : 0)}
            </Typography>
          </Stack>
        )
      },
    },
    {
      accessorKey: 'total_credit',
      header: 'Outstanding Credit',
      cell: (info) => (
        <Typography variant="body2">{formatCurrency(info.getValue<number>())}</Typography>
      ),
    },
  )

  columns.push({
    id: 'actions',
    header: 'Actions',
    cell: (info) => {
      const row = info.row.original
      return (
        <Stack direction="row" spacing={0.5}>
          <Button size="small" startIcon={<Visibility />} onClick={() => setCustomerProfile(row)}>
            View
          </Button>
          {isAdmin && (
            <>
              <Button size="small" startIcon={<Edit />} onClick={() => setDialog({ type: 'edit', customer: row })}>
                Edit
              </Button>
              <Button
                size="small"
                color="error"
                startIcon={<DeleteOutlined />}
                onClick={() => setConfirm({ customer: row })}
              >
                Delete
              </Button>
            </>
          )}
        </Stack>
      )
    },
  })

  return isMobile ? (
    <Suspense fallback={<Loading />}>
      <MobileCustomersScreen />
    </Suspense>
  ) : (
    <Box>
      <PageHeader
        title="Customers"
        subtitle="Manage customer profiles and credit balances"
        actions={
          isAdmin ? (
            <Button variant="contained" startIcon={<Add />} onClick={() => setDialog({ type: 'create' })}>
              Add Customer
            </Button>
          ) : undefined
        }
      />

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
        <TextField
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder="Search by name or phone"
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
        {isSuperAdmin && (
          <Select
            value={shopFilter}
            onChange={(event: SelectChangeEvent<string>) => {
              setShopFilter(event.target.value)
              setPagination((prev) => ({ ...prev, pageIndex: 0 }))
            }}
            displayEmpty
            sx={{ minWidth: 180 }}
          >
            <MenuItem value="">All shops</MenuItem>
            {shops.map((shop) => (
              <MenuItem key={shop.id} value={shop.id}>
                {shop.name}
              </MenuItem>
            ))}
          </Select>
        )}
      </Stack>

      {actionError && <Alert severity="error" sx={{ mb: 2 }}>{actionError}</Alert>}

      <DataTable<CustomerRecord>
        columns={columns}
        data={data?.rows ?? []}
        getRowId={(row) => row.id}
        loading={isLoading}
        rowCount={data?.count ?? 0}
        pagination={pagination}
        onPaginationChange={setPagination}
        emptyTitle="No customers found"
        emptyDescription="Try adjusting your search or filters."
      />

      <CustomerFormDialog
        key={dialog?.type === 'edit' ? dialog.customer.id : 'create'}
        open={dialog?.type === 'create' || dialog?.type === 'edit'}
        mode={dialog?.type === 'edit' ? 'edit' : 'create'}
        customer={dialog?.type === 'edit' ? dialog.customer : undefined}
        shopOptions={shops}
        requireShopSelect={isSuperAdmin}
        defaultShopId={defaultShopId}
        isSubmitting={createCustomer.isPending || updateCustomer.isPending}
        submitError={submitError}
        onSubmit={handleFormSubmit}
        onClose={closeDialog}
      />

      <ConfirmationDialog
        open={confirm !== null}
        title="Delete customer"
        message={
          confirm
            ? `Are you sure you want to delete ${confirm.customer.full_name}? This will hide them from lists and sales. Their sales and credit history will be preserved.`
            : ''
        }
        confirmLabel="Delete"
        confirmColor="error"
        loading={deleteCustomer.isPending}
        onConfirm={() => confirm && handleDelete(confirm)}
        onCancel={() => setConfirm(null)}
      />

      {customerProfile && (
        <CustomerProfileDialog
          customer={customerProfile}
          shopName={shopName(customerProfile.shop_id)}
          onClose={() => setCustomerProfile(null)}
          onEdit={
            isAdmin
              ? () => {
                  setDialog({ type: 'edit', customer: customerProfile })
                  setCustomerProfile(null)
                }
              : undefined
          }
        />
      )}
    </Box>
  )
}
