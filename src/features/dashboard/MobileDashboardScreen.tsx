import { useCallback, useEffect, useState } from 'react'
import AccountBalanceWallet from '@mui/icons-material/AccountBalanceWallet'
import Inventory2 from '@mui/icons-material/Inventory2'
import Payments from '@mui/icons-material/Payments'
import People from '@mui/icons-material/People'
import Savings from '@mui/icons-material/Savings'
import ShoppingCartCheckout from '@mui/icons-material/ShoppingCartCheckout'
import Box from '@mui/material/Box'
import Alert from '@mui/material/Alert'
import MenuItem from '@mui/material/MenuItem'
import Select, { type SelectChangeEvent } from '@mui/material/Select'
import Typography from '@mui/material/Typography'
import { MobileRow, MobileStatCard } from '../../components/mobile'
import EmptyState from '../../components/ui/EmptyState'
import { useAuth } from '../../hooks/useAuth'
import { useShops } from '../../hooks/useShops'
import { useDashboardSummary } from '../../hooks/useDashboard'
import { useCreateProduct } from '../../hooks/useProducts'
import { useCreateCustomer } from '../../hooks/useCustomers'
import { useCreateExpense } from '../../hooks/useExpenses'
import { useQueryClient } from '@tanstack/react-query'
import { getApiErrorMessage } from '../../lib/errors'
import { formatCurrency, formatTime } from '../../lib/utils'
import { useMobileNav } from '../../layouts/mobile/mobileNav'
import type { SaleStatus } from '../../types/sales'
import type { CreateProductFormValues, EditProductFormValues } from '../products/productsSchema'
import CustomerFormDialog from '../customers/CustomerFormDialog'
import type { CreateCustomerFormValues, EditCustomerFormValues } from '../customers/customersSchema'
import ExpenseFormDialog from '../expenses/ExpenseFormDialog'
import type { CreateExpenseFormValues } from '../expenses/expensesSchema'
import MobileProductFormSheet from '../products/mobile/MobileProductFormSheet'

const SALE_STATUS_COLOR: Record<SaleStatus, 'success' | 'warning' | 'error'> = {
  completed: 'success',
  corrected: 'warning',
  reversed: 'error',
}

type QuickDialog = { type: 'product' } | { type: 'customer' } | { type: 'expense' } | null

export default function MobileDashboardScreen() {
  const { profile } = useAuth()
  const mobileNav = useMobileNav()
  const queryClient = useQueryClient()
  const [shopFilter, setShopFilter] = useState('')
  const [dialog, setDialog] = useState<QuickDialog>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const isSuperAdmin = profile?.role === 'super_admin'
  const defaultShopId = isSuperAdmin ? '' : (profile?.shop_id ?? '')
  const shopsQuery = useShops()
  const shops = shopsQuery.data ?? []
  const summaryQuery = useDashboardSummary(
    isSuperAdmin ? (shopFilter || undefined) : (profile?.shop_id ?? undefined),
  )
  const summary = summaryQuery.data
  const createProduct = useCreateProduct()
  const createCustomer = useCreateCustomer()
  const createExpense = useCreateExpense()

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['dashboard'] })
  }, [queryClient])

  useEffect(() => {
    mobileNav.setRefresh(() => refresh())
    return () => mobileNav.setRefresh(null)
  }, [mobileNav, refresh])

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
      refresh()
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
      refresh()
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
      refresh()
      closeDialog()
    } catch (error) {
      setSubmitError(getApiErrorMessage(error))
    }
  }

  const isSubmitting = createProduct.isPending || createCustomer.isPending || createExpense.isPending

  const firstName = profile?.full_name?.split(' ')[0] ?? 'there'
  const shopName = isSuperAdmin
    ? shopFilter
      ? shops.find((shop) => shop.id === shopFilter)?.name ?? 'All Shops'
      : 'All Shops'
    : shops.find((shop) => shop.id === profile?.shop_id)?.name ?? '—'

  const stats = [
    { icon: Inventory2, label: 'Products', value: String(summary?.total_products ?? '—') },
    { icon: People, label: 'Customers', value: String(summary?.total_customers ?? '—'), color: 'secondary' as const },
    { icon: ShoppingCartCheckout, label: "Today's Sales", value: String(summary?.sales_today ?? '—'), color: 'success' as const },
    {
      icon: Payments,
      label: 'Revenue Today',
      value: formatCurrency(summary?.revenue_today ?? 0),
      color: 'success' as const,
      caption: `All: ${formatCurrency(summary?.total_revenue ?? 0)}`,
    },
    { icon: AccountBalanceWallet, label: 'Outstanding Credit', value: formatCurrency(summary?.outstanding_credit ?? 0), color: 'error' as const },
    { icon: Savings, label: 'Expenses', value: formatCurrency(summary?.total_expenses ?? 0), color: 'warning' as const },
  ]

  const recentSales = summary?.recent_sales ?? []

  return (
    <Box>
      <Box sx={{ mb: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
          Hello, {firstName}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {shopName}
        </Typography>
      </Box>

      {isSuperAdmin && (
        <Select
          value={shopFilter}
          onChange={(event: SelectChangeEvent<string>) => setShopFilter(event.target.value)}
          displayEmpty
          size="small"
          fullWidth
          sx={{ mb: 2 }}
        >
          <MenuItem value="">All Shops</MenuItem>
          {shops.map((shop) => (
            <MenuItem key={shop.id} value={shop.id}>
              {shop.name}
            </MenuItem>
          ))}
        </Select>
      )}

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1.5, mb: 2 }}>
        {stats.map((stat) => (
          <MobileStatCard key={stat.label} {...stat} />
        ))}
      </Box>

      {summary && summary.low_stock_count > 0 && (
        <MobileRow
          accent="warning"
          primary="Low stock products"
          secondary={`${summary.low_stock_count} items need attention`}
          trailing={
            <Typography color="primary" sx={{ fontWeight: 600 }}>
              View
            </Typography>
          }
          onClick={() => mobileNav.navigate('products')}
        />
      )}

      <Box sx={{ mt: 2, mb: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
          Recent Sales
        </Typography>
        {recentSales.length === 0 ? (
          <EmptyState title="No sales yet" description="Sales you record will appear here." />
        ) : (
          recentSales.map((sale) => (
            <MobileRow
              key={sale.id}
              accent={SALE_STATUS_COLOR[sale.status]}
              primary={sale.receipt_number}
              secondary={`${formatTime(sale.created_at)} · ${sale.payment_method}`}
              trailing={
                <Typography variant="body1" sx={{ fontWeight: 700 }}>
                  {formatCurrency(sale.total)}
                </Typography>
              }
            />
          ))
        )}
      </Box>

      <Box sx={{ mb: 2 }}>
        {submitError && (
          <Alert severity="error">{submitError}</Alert>
        )}
      </Box>

      <MobileProductFormSheet
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
