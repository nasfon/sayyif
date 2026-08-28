import { useCallback, useEffect, useMemo, useState } from 'react'
import Box from '@mui/material/Box'
import Alert from '@mui/material/Alert'
import CircularProgress from '@mui/material/CircularProgress'
import MenuItem from '@mui/material/MenuItem'
import Select, { type SelectChangeEvent } from '@mui/material/Select'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Add from '@mui/icons-material/Add'
import DeleteOutlined from '@mui/icons-material/DeleteOutlined'
import Edit from '@mui/icons-material/Edit'
import {
  FilterChips,
  MobileRow,
  SearchBar,
  SwipeableRow,
  type SwipeAction,
} from '../../components/mobile'
import { ConfirmationDialog } from '../../components/ui'
import { useInfiniteScroll } from '../../hooks/useInfiniteScroll'
import { useMobileNav } from '../../layouts/mobile/mobileNav'
import { useAuth } from '../../hooks/useAuth'
import { usePermissions } from '../../hooks/usePermissions'
import { useShops } from '../../hooks/useShops'
import {
  useCreateCustomer,
  useDeleteCustomer,
  useInfiniteCustomersList,
  useCustomerPurchaseTotals,
  useUpdateCustomer,
} from '../../hooks/useCustomers'
import { getApiErrorMessage } from '../../lib/errors'
import { formatCurrency } from '../../lib/utils'
import type { CustomerRecord } from '../../types/customers'
import type { CreateCustomerFormValues, EditCustomerFormValues } from './customersSchema'
import MobileCustomerFormSheet from './mobile/MobileCustomerFormSheet'

type CreditFilter = 'all' | 'credit' | 'no_credit'

type DialogState = { type: 'create' } | { type: 'edit'; customer: CustomerRecord }

type ConfirmState = { customer: CustomerRecord } | null

const FILTER_OPTIONS: { value: CreditFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'credit', label: 'With Credit' },
  { value: 'no_credit', label: 'No Credit' },
]

function matchesFilter(customer: CustomerRecord, filter: CreditFilter): boolean {
  if (filter === 'all') return true
  const hasCredit = customer.total_credit > 0
  return filter === 'credit' ? hasCredit : !hasCredit
}

function CustomerRow({ customer, purchaseCount }: { customer: CustomerRecord; purchaseCount?: number }) {
  const hasCredit = customer.total_credit > 0
  return (
    <MobileRow
      accent={hasCredit ? 'warning' : 'default'}
      primary={customer.full_name}
      secondary={[customer.phone, customer.email].filter(Boolean).join(' · ')}
      trailing={
        <Stack>
          <Typography
            variant="body1"
            sx={{ fontWeight: 700, color: hasCredit ? 'error.main' : 'text.primary' }}
          >
            {formatCurrency(customer.total_credit)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {purchaseCount != null ? `${purchaseCount} purchases` : 'No purchases'}
          </Typography>
        </Stack>
      }
    />
  )
}

export default function MobileCustomersScreen() {
  const { profile } = useAuth()
  const permissions = usePermissions()
  const mobileNav = useMobileNav()
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<CreditFilter>('all')
  const [shopId, setShopId] = useState('')
  const [dialog, setDialog] = useState<DialogState | null>(null)
  const [confirm, setConfirm] = useState<ConfirmState>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const isSuperAdmin = permissions.isSuperAdmin
  const canManage = permissions.canManageCustomers
  const defaultShopId = isSuperAdmin ? shopId : (profile?.shop_id ?? '')

  const shopsQuery = useShops()
  const shops = shopsQuery.data ?? []

  const query = useInfiniteCustomersList({ search, shopId: defaultShopId })
  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage, refetch } = query

  const rows = useMemo(() => (data?.pages ?? []).flatMap((page) => page.rows), [data])
  const filteredRows = useMemo(() => rows.filter((row) => matchesFilter(row, filter)), [rows, filter])

  const purchaseTotalsQuery = useCustomerPurchaseTotals(defaultShopId)
  const purchaseTotals = useMemo(
    () => new Map((purchaseTotalsQuery.data ?? []).map((total) => [total.customer_id, total])),
    [purchaseTotalsQuery.data],
  )

  const createCustomer = useCreateCustomer()
  const updateCustomer = useUpdateCustomer()
  const deleteCustomer = useDeleteCustomer()

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
    mobileNav.setFab({ icon: Add, onClick: () => setDialog({ type: 'create' }) })
    return () => mobileNav.setFab(null)
  }, [mobileNav, canManage])

  const sentinelRef = useInfiniteScroll(
    () => {
      if (hasNextPage && !isFetchingNextPage) fetchNextPage()
    },
    hasNextPage && !isFetchingNextPage,
  )

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

  const getActions = useCallback(
    (customer: CustomerRecord): SwipeAction[] => {
      if (!canManage) return []
      return [
        {
          key: 'edit',
          label: 'Edit',
          icon: Edit,
          color: 'primary',
          onClick: () => setDialog({ type: 'edit', customer }),
        },
        {
          key: 'delete',
          label: 'Delete',
          icon: DeleteOutlined,
          color: 'error',
          onClick: () => setConfirm({ customer }),
        },
      ]
    },
    [canManage],
  )

  return (
    <Box>
      <Box sx={{ mb: 1.5 }}>
        <SearchBar value={searchInput} onChange={setSearchInput} placeholder="Search by name or phone" />
      </Box>
      <Box sx={{ mb: 1.5 }}>
        <FilterChips options={FILTER_OPTIONS} value={filter} onChange={setFilter} />
      </Box>
      {isSuperAdmin && (
        <Select
          value={shopId}
          onChange={(event: SelectChangeEvent<string>) => setShopId(event.target.value)}
          displayEmpty
          size="small"
          fullWidth
          sx={{ mb: 1.5 }}
        >
          <MenuItem value="">All shops</MenuItem>
          {shops.map((shop) => (
            <MenuItem key={shop.id} value={shop.id}>
              {shop.name}
            </MenuItem>
          ))}
        </Select>
      )}

      {actionError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {actionError}
        </Alert>
      )}

      {isLoading ? (
        <Stack spacing={1.5}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Box key={i} sx={{ px: 2, py: 1.5, border: 1, borderColor: 'divider', borderRadius: 1.5 }}>
              <Skeleton width="60%" height={20} />
              <Skeleton width="40%" height={16} />
            </Box>
          ))}
        </Stack>
      ) : filteredRows.length === 0 ? (
        <Box sx={{ py: 8, textAlign: 'center' }}>
          <Typography variant="h6">No customers found</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Try adjusting your search or filters.
          </Typography>
        </Box>
      ) : (
        <Box>
          {filteredRows.map((customer) => {
            const totals = purchaseTotals.get(customer.id)
            return (
              <SwipeableRow
                key={customer.id}
                actions={getActions(customer)}
                onClick={() => mobileNav.navigate('customer-profile', { customerId: customer.id })}
              >
                <CustomerRow customer={customer} purchaseCount={totals?.purchase_count} />
              </SwipeableRow>
            )
          })}
          {hasNextPage && (
            <Box ref={sentinelRef} sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
              {isFetchingNextPage ? <CircularProgress size={24} /> : null}
            </Box>
          )}
        </Box>
      )}

      <MobileCustomerFormSheet
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
    </Box>
  )
}
