import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Add from '@mui/icons-material/Add'
import Payments from '@mui/icons-material/Payments'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import MenuItem from '@mui/material/MenuItem'
import Paper from '@mui/material/Paper'
import Select, { type SelectChangeEvent } from '@mui/material/Select'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { BottomSheet, MobileRow, SearchBar } from '../../../components/mobile'
import { FormMoneyField, FormSelect, FormTextField } from '../../../components/forms'
import { useAuth } from '../../../hooks/useAuth'
import { usePermissions } from '../../../hooks/usePermissions'
import { useShops } from '../../../hooks/useShops'
import { useCreateExpense, useInfiniteExpensesList } from '../../../hooks/useExpenses'
import { useInfiniteScroll } from '../../../hooks/useInfiniteScroll'
import { useMobileNav } from '../../../layouts/mobile/mobileNav'
import { getApiErrorMessage } from '../../../lib/errors'
import { formatCurrency, formatDate } from '../../../lib/utils'
import { createExpenseSchema, type CreateExpenseFormValues } from '../expensesSchema'
import type { ExpenseRecord } from '../../../types/expenses'

type ExpenseFormInput = z.input<typeof createExpenseSchema>

export default function MobileExpensesScreen() {
  const { profile } = useAuth()
  const permissions = usePermissions()
  const mobileNav = useMobileNav()
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [shopId, setShopId] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const isSuperAdmin = permissions.isSuperAdmin
  const canManage = permissions.canManageExpenses
  const defaultShopId = isSuperAdmin ? shopId : (profile?.shop_id ?? '')

  const shopsQuery = useShops()
  const shops = shopsQuery.data ?? []

  const query = useInfiniteExpensesList({ search, shopId: defaultShopId })
  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage, refetch } = query

  const rows = useMemo(
    () => (data?.pages ?? []).flatMap((page) => page.rows),
    [data],
  )

  const totalAmount = useMemo(
    () => rows.reduce((sum, row) => sum + Number(row.amount), 0),
    [rows],
  )

  const createExpense = useCreateExpense()

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
    mobileNav.setFab({ icon: Add, label: 'Record', onClick: () => setFormOpen(true) })
    return () => mobileNav.setFab(null)
  }, [mobileNav, canManage])

  const sentinelRef = useInfiniteScroll(
    () => {
      if (hasNextPage && !isFetchingNextPage) fetchNextPage()
    },
    hasNextPage && !isFetchingNextPage,
  )

  const closeForm = () => {
    setFormOpen(false)
    setSubmitError(null)
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
      closeForm()
    } catch (error) {
      setSubmitError(getApiErrorMessage(error))
    }
  }

  return (
    <Box>
      <Stack direction="row" spacing={1.5} sx={{ mb: 1.5 }}>
        <Paper variant="outlined" sx={{ p: 1.5, flex: 1, minWidth: 0 }}>
          <Typography variant="caption" color="text.secondary" noWrap>
            Total Expenses
          </Typography>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }} noWrap>
            {formatCurrency(totalAmount)}
          </Typography>
        </Paper>
        <Paper variant="outlined" sx={{ p: 1.5, flex: 1, minWidth: 0 }}>
          <Typography variant="caption" color="text.secondary" noWrap>
            Records
          </Typography>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }} noWrap>
            {rows.length}
          </Typography>
        </Paper>
      </Stack>

      <Box sx={{ mb: 1.5 }}>
        <SearchBar value={searchInput} onChange={setSearchInput} placeholder="Search by description" />
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
          <Typography variant="h6">No expenses found</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Record an expense to start tracking your business spend.
          </Typography>
        </Box>
      ) : (
        <Box>
          {rows.map((expense: ExpenseRecord) => (
            <MobileRow
              key={expense.id}
              leading={<Payments color="action" />}
              primary={expense.description}
              secondary={
                isSuperAdmin
                  ? `${formatDate(expense.expense_date)} · ${expense.shop_name ?? '—'}`
                  : `${formatDate(expense.expense_date)} · ${expense.recorded_by_name ?? '—'}`
              }
              trailing={
                <Typography variant="body1" sx={{ fontWeight: 700 }}>
                  {formatCurrency(expense.amount)}
                </Typography>
              }
            />
          ))}
          <Box ref={sentinelRef} sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
            {isFetchingNextPage ? <CircularProgress size={24} /> : null}
          </Box>
        </Box>
      )}

      <BottomSheet open={formOpen} onClose={closeForm} title="Record Expense">
        {formOpen && (
          <RecordExpenseForm
            shops={shops}
            requireShopSelect={isSuperAdmin}
            defaultShopId={defaultShopId}
            isSubmitting={createExpense.isPending}
            submitError={submitError}
            onSubmit={handleSubmit}
            onClose={closeForm}
          />
        )}
      </BottomSheet>
    </Box>
  )
}

interface RecordExpenseFormProps {
  shops: { id: string; name: string }[]
  requireShopSelect: boolean
  defaultShopId: string
  isSubmitting: boolean
  submitError: string | null
  onSubmit: (values: CreateExpenseFormValues) => void
  onClose: () => void
}

function RecordExpenseForm({
  shops,
  requireShopSelect,
  defaultShopId,
  isSubmitting,
  submitError,
  onSubmit,
  onClose,
}: RecordExpenseFormProps) {
  const defaults: ExpenseFormInput = {
    shop_id: defaultShopId,
    description: '',
    amount: '' as never,
    expense_date: new Date().toISOString().slice(0, 10),
  }

  const {
    control,
    handleSubmit,
    formState: { isSubmitting: formSubmitting },
  } = useForm<ExpenseFormInput, unknown, CreateExpenseFormValues>({
    resolver: zodResolver(createExpenseSchema),
    defaultValues: defaults,
  })

  return (
    <Box component="form" noValidate onSubmit={handleSubmit(onSubmit)}>
      {submitError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {submitError}
        </Alert>
      )}
      {requireShopSelect && (
        <FormSelect name="shop_id" control={control} label="Shop">
          <MenuItem value="">Select a shop</MenuItem>
          {shops.map((shop) => (
            <MenuItem key={shop.id} value={shop.id}>
              {shop.name}
            </MenuItem>
          ))}
        </FormSelect>
      )}
      <FormTextField
        name="description"
        control={control}
        label="Description"
        autoFocus
        autoComplete="off"
      />
      <FormMoneyField name="amount" control={control} label="Amount" autoComplete="off" />
      <FormTextField
        name="expense_date"
        control={control}
        label="Expense date"
        type="date"
        slotProps={{ htmlInput: { max: new Date().toISOString().slice(0, 10) } }}
      />
      <Stack direction="row" spacing={1.5} sx={{ mt: 2.5 }}>
        <Button onClick={onClose} disabled={isSubmitting || formSubmitting} fullWidth>
          Cancel
        </Button>
        <Button type="submit" variant="contained" disabled={isSubmitting || formSubmitting} fullWidth>
          Save Expense
        </Button>
      </Stack>
    </Box>
  )
}
