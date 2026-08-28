import { lazy, Suspense, useCallback, useEffect, useState, type ComponentType } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { SvgIconProps } from '@mui/material/SvgIcon'
import Loading from '../../components/feedback/Loading'
import AccountBalanceWallet from '@mui/icons-material/AccountBalanceWallet'
import Inventory2 from '@mui/icons-material/Inventory2'
import Payments from '@mui/icons-material/Payments'
import People from '@mui/icons-material/People'
import PointOfSale from '@mui/icons-material/PointOfSale'
import Savings from '@mui/icons-material/Savings'
import ShoppingCartCheckout from '@mui/icons-material/ShoppingCartCheckout'
import WarningAmber from '@mui/icons-material/WarningAmber'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import MenuItem from '@mui/material/MenuItem'
import Paper from '@mui/material/Paper'
import Select, { type SelectChangeEvent } from '@mui/material/Select'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import StatusBadge from '../../components/ui/StatusBadge'
import PageHeader from '../../components/ui/PageHeader'
import { useAuth } from '../../hooks/useAuth'
import { useDashboardSummary } from '../../hooks/useDashboard'
import { useShops } from '../../hooks/useShops'
import { useCreateProduct } from '../../hooks/useProducts'
import { useCreateCustomer } from '../../hooks/useCustomers'
import { useCreateExpense } from '../../hooks/useExpenses'
import { getApiErrorMessage } from '../../lib/errors'
import { formatCurrency, formatTime } from '../../lib/utils'
import type { PageKey } from '../../layouts/navigation'
import { useMobileNav } from '../../layouts/mobile/mobileNav'
import type { SaleStatus } from '../../types/sales'
import ProductFormDialog from '../products/ProductFormDialog'
import type { CreateProductFormValues, EditProductFormValues } from '../products/productsSchema'
import CustomerFormDialog from '../customers/CustomerFormDialog'
import type { CreateCustomerFormValues, EditCustomerFormValues } from '../customers/customersSchema'
import ExpenseFormDialog from '../expenses/ExpenseFormDialog'
import type { CreateExpenseFormValues } from '../expenses/expensesSchema'

const MobileDashboardScreen = lazy(() => import('./MobileDashboardScreen'))
const CashierHome = lazy(() => import('./CashierHome'))

interface StatCardProps {
  icon: ComponentType<SvgIconProps>
  label: string
  value: string
  caption?: string
  color?: 'primary' | 'success' | 'warning' | 'error' | 'secondary'
}

function StatCard({ icon: Icon, label, value, caption, color = 'primary' }: StatCardProps) {
  return (
    <Paper variant="outlined" sx={{ p: 2, flex: 1, minWidth: 200 }}>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: `${color}.main`,
            color: 'white',
            flexShrink: 0,
          }}
        >
          <Icon fontSize="small" />
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="caption" color="text.secondary" noWrap>
            {label}
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.25 }}>
            {value}
          </Typography>
          {caption && (
            <Typography variant="caption" color="text.secondary" noWrap>
              {caption}
            </Typography>
          )}
        </Box>
      </Stack>
    </Paper>
  )
}

const SALE_STATUS_COLORS: Record<SaleStatus, 'success' | 'warning' | 'error'> = {
  completed: 'success',
  corrected: 'warning',
  reversed: 'error',
}

type QuickDialog = { type: 'product' } | { type: 'customer' } | { type: 'expense' } | null

interface DashboardPageProps {
  onNavigate?: (key: PageKey) => void
}

export default function DashboardPage({ onNavigate }: DashboardPageProps = {}) {
  const { profile } = useAuth()

  if (profile?.role === 'cashier') {
    return (
      <Suspense fallback={<Loading />}>
        <CashierHome onNavigate={onNavigate} />
      </Suspense>
    )
  }

  return <AdminDashboard onNavigate={onNavigate} />
}

function AdminDashboard({ onNavigate }: DashboardPageProps = {}) {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const [shopFilter, setShopFilter] = useState('')
  const [dialog, setDialog] = useState<QuickDialog>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const isSuperAdmin = profile?.role === 'super_admin'
  const defaultShopId = isSuperAdmin ? '' : (profile?.shop_id ?? '')
  const shopsQuery = useShops()
  const shops = shopsQuery.data ?? []
  const summaryQuery = useDashboardSummary(isSuperAdmin ? shopFilter || undefined : (profile?.shop_id ?? undefined))
  const summary = summaryQuery.data
  const createProduct = useCreateProduct()
  const createCustomer = useCreateCustomer()
  const createExpense = useCreateExpense()
  const mobileNav = useMobileNav()
  const isMobile = mobileNav.isMobile

  const refreshDashboard = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['dashboard'] })
  }, [queryClient])

  useEffect(() => {
    if (isMobile) return
    mobileNav.setRefresh(() => refreshDashboard())
    return () => mobileNav.setRefresh(null)
  }, [mobileNav, refreshDashboard, isMobile])

  const closeDialog = () => {
    setDialog(null)
    setSubmitError(null)
  }

  const handleCreateProduct = async (values: CreateProductFormValues | EditProductFormValues) => {
    const v = values as CreateProductFormValues
    setSubmitError(null)
    try {
      await createProduct.mutateAsync({
        shop_id: v.shop_id,
        name: v.name,
        sku: v.sku,
        quantity: v.quantity,
        selling_price: v.selling_price,
        minimum_stock: v.minimum_stock,
      })
      refreshDashboard()
      closeDialog()
    } catch (error) {
      const e = error as { code?: string; message?: string }
      if (e.code === '23505' || (e.message ?? '').includes('duplicate key')) {
        setSubmitError('A product with this SKU already exists in this shop.')
      } else {
        setSubmitError(getApiErrorMessage(error))
      }
    }
  }

  const handleCreateCustomer = async (values: CreateCustomerFormValues | EditCustomerFormValues) => {
    const v = values as CreateCustomerFormValues
    setSubmitError(null)
    try {
      await createCustomer.mutateAsync({
        shop_id: v.shop_id,
        full_name: v.full_name,
        phone: v.phone,
        email: v.email || undefined,
        address: v.address || undefined,
      })
      refreshDashboard()
      closeDialog()
    } catch (error) {
      setSubmitError(getApiErrorMessage(error))
    }
  }

  const handleCreateExpense = async (values: CreateExpenseFormValues) => {
    setSubmitError(null)
    try {
      await createExpense.mutateAsync({
        shop_id: values.shop_id,
        description: values.description,
        amount: values.amount,
        expense_date: values.expense_date,
      })
      refreshDashboard()
      closeDialog()
    } catch (error) {
      setSubmitError(getApiErrorMessage(error))
    }
  }

  const isSubmitting = createProduct.isPending || createCustomer.isPending || createExpense.isPending

  return isMobile ? (
    <Suspense fallback={<Loading />}>
      <MobileDashboardScreen />
    </Suspense>
  ) : (
    <Box>
      <PageHeader title="Dashboard" subtitle="Overview of sales, inventory, and credit across your shop" />

      {isSuperAdmin && (
        <Select
          value={shopFilter}
          onChange={(event: SelectChangeEvent<string>) => setShopFilter(event.target.value)}
          displayEmpty
          size="small"
          sx={{ minWidth: 180, mb: 2 }}
        >
          <MenuItem value="">All shops</MenuItem>
          {shops.map((shop) => (
            <MenuItem key={shop.id} value={shop.id}>
              {shop.name}
            </MenuItem>
          ))}
        </Select>
      )}

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2, flexWrap: 'wrap' }}>
        <StatCard icon={Inventory2} label="Total Products" value={String(summary?.total_products ?? '—')} />
        <StatCard icon={People} label="Total Customers" value={String(summary?.total_customers ?? '—')} color="secondary" />
        <StatCard icon={ShoppingCartCheckout} label="Today's Sales" value={String(summary?.sales_today ?? '—')} color="success" />
      </Stack>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2, flexWrap: 'wrap' }}>
        <StatCard
          icon={Payments}
          label="Revenue Today"
          value={formatCurrency(summary?.revenue_today ?? 0)}
          caption={`All time: ${formatCurrency(summary?.total_revenue ?? 0)}`}
          color="success"
        />
        <StatCard
          icon={AccountBalanceWallet}
          label="Outstanding Credit"
          value={formatCurrency(summary?.outstanding_credit ?? 0)}
          color="error"
        />
        <StatCard icon={Savings} label="Total Expenses" value={formatCurrency(summary?.total_expenses ?? 0)} color="warning" />
        <StatCard
          icon={WarningAmber}
          label="Low Stock Products"
          value={String(summary?.low_stock_count ?? '—')}
          color={Number(summary?.low_stock_count ?? 0) > 0 ? 'warning' : 'primary'}
        />
      </Stack>

      <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2}>
        <Paper variant="outlined" sx={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
          <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', p: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Recent Sales
            </Typography>
            <Button size="small" onClick={() => onNavigate?.('sales-history')}>
              View all
            </Button>
          </Stack>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Receipt</TableCell>
                  <TableCell>Time</TableCell>
                  <TableCell>Payment</TableCell>
                  <TableCell align="right">Total</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(summary?.recent_sales ?? []).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                      No sales yet today.
                    </TableCell>
                  </TableRow>
                )}
                {(summary?.recent_sales ?? []).map((sale) => (
                  <TableRow key={sale.id} hover>
                    <TableCell sx={{ fontWeight: 600 }}>{sale.receipt_number}</TableCell>
                    <TableCell>{formatTime(sale.created_at)}</TableCell>
                    <TableCell>{sale.payment_method}</TableCell>
                    <TableCell align="right">{formatCurrency(sale.total)}</TableCell>
                    <TableCell>
                      <StatusBadge
                        label={sale.status}
                        color={SALE_STATUS_COLORS[sale.status]}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

        {!mobileNav.isMobile && (
          <Paper variant="outlined" sx={{ width: { lg: 260 }, alignSelf: 'flex-start' }}>
            <Typography variant="h6" sx={{ fontWeight: 600, p: 2 }}>
              Quick Actions
            </Typography>
            <Stack spacing={1} sx={{ p: 2, pt: 0 }}>
              <Button
                variant="outlined"
                color="primary"
                startIcon={<PointOfSale fontSize="small" />}
                sx={{ justifyContent: 'flex-start' }}
                onClick={() => onNavigate?.('sales')}
              >
                New Sale
              </Button>
              <Button
                variant="outlined"
                color="primary"
                startIcon={<Inventory2 fontSize="small" />}
                sx={{ justifyContent: 'flex-start' }}
                onClick={() => setDialog({ type: 'product' })}
              >
                Add Product
              </Button>
              <Button
                variant="outlined"
                color="primary"
                startIcon={<People fontSize="small" />}
                sx={{ justifyContent: 'flex-start' }}
                onClick={() => setDialog({ type: 'customer' })}
              >
                Add Customer
              </Button>
              <Button
                variant="outlined"
                color="primary"
                startIcon={<Payments fontSize="small" />}
                sx={{ justifyContent: 'flex-start' }}
                onClick={() => setDialog({ type: 'expense' })}
              >
                Record Expense
              </Button>
            </Stack>
          </Paper>
        )}
      </Stack>

      {submitError && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {submitError}
        </Alert>
      )}

      <ProductFormDialog
        open={dialog?.type === 'product'}
        mode="create"
        shopOptions={shops}
        requireShopSelect={isSuperAdmin}
        defaultShopId={defaultShopId}
        isSubmitting={isSubmitting}
        submitError={submitError}
        onSubmit={handleCreateProduct}
        onClose={closeDialog}
      />

      <CustomerFormDialog
        open={dialog?.type === 'customer'}
        mode="create"
        shopOptions={shops}
        requireShopSelect={isSuperAdmin}
        defaultShopId={defaultShopId}
        isSubmitting={isSubmitting}
        submitError={submitError}
        onSubmit={handleCreateCustomer}
        onClose={closeDialog}
      />

      <ExpenseFormDialog
        open={dialog?.type === 'expense'}
        shopOptions={shops}
        requireShopSelect={isSuperAdmin}
        defaultShopId={defaultShopId}
        isSubmitting={isSubmitting}
        submitError={submitError}
        onSubmit={handleCreateExpense}
        onClose={closeDialog}
      />
    </Box>
  )
}