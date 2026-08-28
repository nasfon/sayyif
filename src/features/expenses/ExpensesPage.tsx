import { lazy, Suspense, useEffect, useState } from 'react'
import { useMobileNav } from '../../layouts/mobile/mobileNav'
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
import Search from '@mui/icons-material/Search'
import DataTable from '../../components/data/DataTable'
import { type TableFeatures } from '../../components/data/table'
import PageHeader from '../../components/ui/PageHeader'
import { getApiErrorMessage } from '../../lib/errors'
import { formatCurrency } from '../../lib/utils'
import { useAuth } from '../../hooks/useAuth'
import { usePermissions } from '../../hooks/usePermissions'
import { useExpensesList, useCreateExpense } from '../../hooks/useExpenses'
import { useShops } from '../../hooks/useShops'
import type { ExpenseRecord } from '../../types/expenses'
import ExpenseFormDialog from './ExpenseFormDialog'
import type { CreateExpenseFormValues } from './expensesSchema'

const MobileExpensesScreen = lazy(() => import('./mobile/MobileExpensesScreen'))

export default function ExpensesPage() {
  const mobileNav = useMobileNav()
  const isMobile = mobileNav.isMobile
  const { profile } = useAuth()
  const permissions = usePermissions()
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 })
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [shopFilter, setShopFilter] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const isSuperAdmin = permissions.isSuperAdmin
  const defaultShopId = isSuperAdmin ? '' : (profile?.shop_id ?? '')

  const shopsQuery = useShops()
  const shops = shopsQuery.data ?? []
  const expensesQuery = useExpensesList({
    page: pagination.pageIndex,
    pageSize: pagination.pageSize,
    search,
    shopId: isSuperAdmin ? shopFilter : defaultShopId,
    fromDate: fromDate || undefined,
    toDate: toDate || undefined,
  })
  const { data, isLoading, refetch: refetchExpenses } = expensesQuery
  const createExpense = useCreateExpense()

  useEffect(() => {
    mobileNav.setRefresh(() => refetchExpenses())
    return () => mobileNav.setRefresh(null)
  }, [mobileNav, refetchExpenses])

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
        <MobileExpensesScreen />
      </Suspense>
    )
  }


  const resetFilters = () => {
    setFromDate('')
    setToDate('')
    setShopFilter('')
    setPagination((prev) => ({ ...prev, pageIndex: 0 }))
  }

  const handleSubmit = async (values: CreateExpenseFormValues) => {
    setSubmitError(null)
    try {
      await createExpense.mutateAsync({
        shop_id: values.shop_id,
        description: values.description,
        amount: values.amount,
        expense_date: values.expense_date,
      })
      setFormOpen(false)
    } catch (error) {
      setSubmitError(getApiErrorMessage(error))
    }
  }

  const columns: ColumnDef<TableFeatures, ExpenseRecord, unknown>[] = []

  if (isSuperAdmin) {
    columns.push({
      accessorKey: 'shop_name',
      header: 'Shop',
      cell: (info) => <Typography variant="body2">{info.getValue<string>() ?? '—'}</Typography>,
    })
  }

  columns.push(
    {
      accessorKey: 'expense_date',
      header: 'Date',
      cell: (info) => <Typography variant="body2">{info.getValue<string>()}</Typography>,
    },
    {
      accessorKey: 'description',
      header: 'Description',
      cell: (info) => <Typography variant="body2">{info.getValue<string>()}</Typography>,
    },
    {
      accessorKey: 'amount',
      header: 'Amount',
      cell: (info) => (
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {formatCurrency(info.getValue<number>())}
        </Typography>
      ),
    },
    {
      accessorKey: 'recorded_by_name',
      header: 'Recorded By',
      cell: (info) => <Typography variant="body2">{info.getValue<string>() ?? '—'}</Typography>,
    },
  )

  return (
    <Box>
      <PageHeader
        title="Expenses"
        subtitle="Track business expenses across your shop"
        actions={
          permissions.canManageExpenses ? (
            <Button variant="contained" startIcon={<Add />} onClick={() => setFormOpen(true)}>
              Record Expense
            </Button>
          ) : undefined
        }
      />

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
        <TextField
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder="Search by description"
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
        <TextField
          label="From"
          type="date"
          value={fromDate}
          onChange={(event) => {
            setFromDate(event.target.value)
            setPagination((prev) => ({ ...prev, pageIndex: 0 }))
          }}
          slotProps={{ htmlInput: { max: toDate || undefined }, inputLabel: { shrink: true } }}
          sx={{ minWidth: 170 }}
        />
        <TextField
          label="To"
          type="date"
          value={toDate}
          onChange={(event) => {
            setToDate(event.target.value)
            setPagination((prev) => ({ ...prev, pageIndex: 0 }))
          }}
          slotProps={{ htmlInput: { min: fromDate || undefined }, inputLabel: { shrink: true } }}
          sx={{ minWidth: 170 }}
        />
        <Button variant="outlined" onClick={resetFilters}>
          Clear
        </Button>
      </Stack>

      <DataTable<ExpenseRecord>
        columns={columns}
        data={data?.rows ?? []}
        getRowId={(row) => row.id}
        loading={isLoading}
        rowCount={data?.count ?? 0}
        pagination={pagination}
        onPaginationChange={setPagination}
        emptyTitle="No expenses found"
        emptyDescription="Try adjusting your search or filters."
      />

      {submitError && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {submitError}
        </Alert>
      )}

      <ExpenseFormDialog
        open={formOpen}
        shopOptions={shops}
        requireShopSelect={isSuperAdmin}
        defaultShopId={defaultShopId}
        isSubmitting={createExpense.isPending}
        submitError={submitError}
        onSubmit={handleSubmit}
        onClose={() => {
          setFormOpen(false)
          setSubmitError(null)
        }}
      />
    </Box>
  )
}