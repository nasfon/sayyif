import { useEffect, useState, type ReactNode } from 'react'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import CalendarMonth from '@mui/icons-material/CalendarMonth'
import DeleteOutlined from '@mui/icons-material/DeleteOutlined'
import Edit from '@mui/icons-material/Edit'
import EmailOutlined from '@mui/icons-material/EmailOutlined'
import History from '@mui/icons-material/History'
import Payments from '@mui/icons-material/Payments'
import PlaceOutlined from '@mui/icons-material/PlaceOutlined'
import Storefront from '@mui/icons-material/Storefront'
import { ConfirmationDialog } from '../../../components/ui'
import { MobileRow } from '../../../components/mobile'
import Loading from '../../../components/feedback/Loading'
import { useMobileNav } from '../../../layouts/mobile/mobileNav'
import { useAuth } from '../../../hooks/useAuth'
import { usePermissions } from '../../../hooks/usePermissions'
import { useShops } from '../../../hooks/useShops'
import {
  useCustomerProfile,
  useCustomerPurchaseHistory,
  useCustomerPurchaseTotals,
  useDeleteCustomer,
  useUpdateCustomer,
} from '../../../hooks/useCustomers'
import {
  useCustomerPayments,
  useRecordCreditPayment,
} from '../../../hooks/useCredit'
import { getApiErrorMessage } from '../../../lib/errors'
import { formatCurrency, formatDate, formatDateTime } from '../../../lib/utils'
import { PAYMENT_METHOD_LABELS, type SaleRecord } from '../../../types/sales'
import { CREDIT_PAYMENT_METHOD_LABELS, type CreditPaymentRecord } from '../../../types/credit'
import type { ShopOption } from '../../../types/users'
import type { CreateCustomerFormValues, EditCustomerFormValues } from '../customersSchema'
import MobileCustomerFormSheet from './MobileCustomerFormSheet'
import RecordPaymentDialog from '../../credit/RecordPaymentDialog'
import type { RecordPaymentFormValues } from '../../credit/creditSchema'

function InfoRow({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <Stack direction="row" spacing={1.5} sx={{ alignItems: 'flex-start' }}>
      <Box sx={{ color: 'text.secondary', display: 'flex', mt: 0.3 }}>{icon}</Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="caption" color="text.secondary">
          {label}
        </Typography>
        <Typography variant="body2" noWrap>
          {value}
        </Typography>
      </Box>
    </Stack>
  )
}

function StatCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <Paper variant="outlined" sx={{ p: 1.5, flex: 1, minWidth: 0 }}>
      <Typography variant="caption" color="text.secondary" noWrap>
        {label}
      </Typography>
      <Typography variant="subtitle1" sx={{ fontWeight: 700, color: color ?? 'text.primary' }} noWrap>
        {value}
      </Typography>
    </Paper>
  )
}

export default function MobileCustomerProfileScreen() {
  const mobileNav = useMobileNav()
  const { profile } = useAuth()
  const permissions = usePermissions()
  const customerId = mobileNav.params?.customerId ?? null

  const shopsQuery = useShops()
  const shops = shopsQuery.data ?? []
  const shopOptions: ShopOption[] = shops.map((shop) => ({ id: shop.id, name: shop.name }))
  const shopName = (id: string) => shops.find((shop) => shop.id === id)?.name ?? '—'

  const profileQuery = useCustomerProfile(customerId)
  const customer = profileQuery.data
  const outstanding = customer?.total_credit ?? 0

  const totalsQuery = useCustomerPurchaseTotals(profile?.shop_id ?? '', customerId ?? undefined)
  const purchaseTotals = totalsQuery.data?.[0]

  const [purchaseLimit, setPurchaseLimit] = useState(15)
  const historyQuery = useCustomerPurchaseHistory(customerId ?? '', {
    page: 0,
    pageSize: purchaseLimit,
  })
  const purchases = historyQuery.data?.rows ?? []

  const [paymentLimit, setPaymentLimit] = useState(15)
  const paymentsQuery = useCustomerPayments(customerId ?? '', { page: 0, pageSize: paymentLimit })
  const payments = paymentsQuery.data?.rows ?? []

  const updateCustomer = useUpdateCustomer()
  const deleteCustomer = useDeleteCustomer()
  const recordPayment = useRecordCreditPayment()

  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [markPaidOpen, setMarkPaidOpen] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  useEffect(() => {
    if (customer) mobileNav.setTitle(customer.full_name)
    return () => mobileNav.setTitle(null)
  }, [customer, mobileNav])

  if (profileQuery.isLoading) {
    return <Loading label="Loading customer..." />
  }

  if (!customer) {
    return (
      <Box sx={{ py: 8, textAlign: 'center', px: 2 }}>
        <Typography variant="h6">Customer not found</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          This customer may have been removed.
        </Typography>
      </Box>
    )
  }

  const initials = customer.full_name.charAt(0).toUpperCase()

  const handleEditSubmit = async (values: CreateCustomerFormValues | EditCustomerFormValues) => {
    setSubmitError(null)
    try {
      const v = values as EditCustomerFormValues
      await updateCustomer.mutateAsync({
        customer_id: customer.id,
        full_name: v.full_name,
        phone: v.phone,
        email: v.email || undefined,
        address: v.address || undefined,
      })
      setEditOpen(false)
    } catch (error) {
      setSubmitError(getApiErrorMessage(error))
    }
  }

  const handleDelete = async () => {
    setActionError(null)
    try {
      await deleteCustomer.mutateAsync(customer.id)
      mobileNav.navigate('customers')
    } catch (error) {
      setActionError(getApiErrorMessage(error))
      setDeleteOpen(false)
    }
  }

  const handleRecordPayment = async (values: RecordPaymentFormValues) => {
    setSubmitError(null)
    try {
      await recordPayment.mutateAsync({
        customer_id: customer.id,
        amount: values.amount,
        payment_method: values.payment_method,
      })
      setPaymentOpen(false)
    } catch (error) {
      setSubmitError(getApiErrorMessage(error))
    }
  }

  const handleMarkFullyPaid = async () => {
    setActionError(null)
    try {
      await recordPayment.mutateAsync({
        customer_id: customer.id,
        amount: outstanding,
        payment_method: 'cash',
      })
      setMarkPaidOpen(false)
    } catch (error) {
      setActionError(getApiErrorMessage(error))
      setMarkPaidOpen(false)
    }
  }

  return (
    <Box sx={{ pb: 4 }}>
      <Paper sx={{ p: 2, mb: 2 }}>
          <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
          <Avatar sx={{ bgcolor: 'primary.main', width: 56, height: 56, fontSize: 24 }}>
            {initials}
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }} noWrap>
              {customer.full_name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {customer.phone}
            </Typography>
          </Box>
          {permissions.canManageCustomers && (
            <IconButton aria-label="Edit customer" onClick={() => setEditOpen(true)}>
              <Edit />
            </IconButton>
          )}
          {permissions.canManageCustomers && (
            <IconButton aria-label="Delete customer" color="error" onClick={() => setDeleteOpen(true)}>
              <DeleteOutlined />
            </IconButton>
          )}
        </Stack>
        <Divider sx={{ my: 1.5 }} />
        <Stack spacing={1}>
          <InfoRow icon={<EmailOutlined fontSize="small" />} label="Email" value={customer.email ?? '—'} />
          <InfoRow icon={<PlaceOutlined fontSize="small" />} label="Address" value={customer.address ?? '—'} />
          <InfoRow icon={<Storefront fontSize="small" />} label="Shop" value={shopName(customer.shop_id)} />
          <InfoRow
            icon={<CalendarMonth fontSize="small" />}
            label="Member since"
            value={formatDate(customer.created_at)}
          />
        </Stack>
      </Paper>

      <Stack direction="row" spacing={1.5} sx={{ mb: 2 }}>
        <StatCard
          label="Outstanding"
          value={formatCurrency(outstanding)}
          color={outstanding > 0 ? 'error.main' : 'success.main'}
        />
        <StatCard label="Purchases" value={String(purchaseTotals?.purchase_count ?? 0)} />
        <StatCard label="Total Spent" value={formatCurrency(purchaseTotals?.total_spent ?? 0)} />
      </Stack>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack
          direction="row"
          sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1 }}
        >
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            Credit
          </Typography>
          {permissions.canManageCredit && outstanding > 0 && (
            <Button
              size="small"
              variant="contained"
              startIcon={<Payments />}
              onClick={() => setPaymentOpen(true)}
            >
              Record Payment
            </Button>
          )}
        </Stack>
        <Typography
          variant="h5"
          sx={{ fontWeight: 700, color: outstanding > 0 ? 'error.main' : 'success.main' }}
        >
          {formatCurrency(outstanding)}
        </Typography>
        {permissions.canManageCredit && outstanding > 0 && (
          <Button fullWidth sx={{ mt: 1 }} onClick={() => setMarkPaidOpen(true)}>
            Mark Fully Paid
          </Button>
        )}
        <Divider sx={{ my: 1.5 }} />
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1 }}>
          <History fontSize="small" color="action" />
          <Typography variant="subtitle2">Payment History</Typography>
        </Stack>
        {payments.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No payments recorded yet.
          </Typography>
        ) : (
          <Stack>
            {payments.map((payment: CreditPaymentRecord) => (
              <MobileRow
                key={payment.id}
                primary={formatCurrency(payment.amount)}
                secondary={`${formatDateTime(payment.created_at)} · ${CREDIT_PAYMENT_METHOD_LABELS[payment.payment_method]}`}
                trailing={
                  <Typography variant="caption" color="text.secondary">
                    {payment.received_by_name ?? '—'}
                  </Typography>
                }
              />
            ))}
            {paymentsQuery.data && paymentsQuery.data.count > paymentLimit && (
              <Button
                fullWidth
                variant="outlined"
                sx={{ mt: 1 }}
                disabled={paymentsQuery.isFetching}
                onClick={() => setPaymentLimit((prev) => prev + 15)}
              >
                {paymentsQuery.isFetching ? <CircularProgress size={20} /> : 'Load more'}
              </Button>
            )}
          </Stack>
        )}
      </Paper>

      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
          Purchase History
        </Typography>
        {purchases.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No purchases recorded yet.
          </Typography>
        ) : (
          <Stack>
            {purchases.map((sale: SaleRecord) => (
              <MobileRow
                key={sale.id}
                onClick={() => mobileNav.navigate('receipt', { saleId: sale.id })}
                primary={sale.receipt_number}
                secondary={`${formatDateTime(sale.created_at)} · ${PAYMENT_METHOD_LABELS[sale.payment_method]}`}
                trailing={
                  <Stack sx={{ alignItems: 'flex-end' }}>
                    <Typography variant="body1" sx={{ fontWeight: 700 }}>
                      {formatCurrency(sale.total)}
                    </Typography>
                    {sale.remaining_credit > 0 && (
                      <Typography variant="caption" color="error.main">
                        Credit {formatCurrency(sale.remaining_credit)}
                      </Typography>
                    )}
                  </Stack>
                }
              />
            ))}
            {historyQuery.data && historyQuery.data.count > purchaseLimit && (
              <Button
                fullWidth
                variant="outlined"
                sx={{ mt: 1 }}
                disabled={historyQuery.isFetching}
                onClick={() => setPurchaseLimit((prev) => prev + 15)}
              >
                {historyQuery.isFetching ? <CircularProgress size={20} /> : 'Load more'}
              </Button>
            )}
          </Stack>
        )}
      </Box>

      {actionError && (
        <Typography variant="body2" color="error.main" sx={{ px: 2, mb: 2 }}>
          {actionError}
        </Typography>
      )}

      <MobileCustomerFormSheet
        open={editOpen}
        mode="edit"
        customer={customer}
        shopOptions={shopOptions}
        requireShopSelect={permissions.isSuperAdmin}
        defaultShopId={profile?.shop_id ?? ''}
        isSubmitting={updateCustomer.isPending}
        submitError={submitError}
        onSubmit={handleEditSubmit}
        onClose={() => {
          setEditOpen(false)
          setSubmitError(null)
        }}
      />

      <RecordPaymentDialog
        open={paymentOpen}
        customerName={customer.full_name}
        outstanding={outstanding}
        isSubmitting={recordPayment.isPending}
        submitError={submitError}
        onSubmit={handleRecordPayment}
        onClose={() => {
          setPaymentOpen(false)
          setSubmitError(null)
        }}
      />

      <ConfirmationDialog
        open={deleteOpen}
        title="Delete customer"
        message={`Are you sure you want to delete ${customer.full_name}? Their sales and credit history will be preserved.`}
        confirmLabel="Delete"
        confirmColor="error"
        loading={deleteCustomer.isPending}
        onConfirm={handleDelete}
        onCancel={() => setDeleteOpen(false)}
      />

      <ConfirmationDialog
        open={markPaidOpen}
        title="Mark fully paid"
        message={`Record a ${formatCurrency(outstanding)} payment to clear ${customer.full_name}'s outstanding balance?`}
        confirmLabel="Mark Paid"
        confirmColor="success"
        loading={recordPayment.isPending}
        onConfirm={handleMarkFullyPaid}
        onCancel={() => setMarkPaidOpen(false)}
      />
    </Box>
  )
}
