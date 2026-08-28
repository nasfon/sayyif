import { useEffect, useMemo, useState } from 'react'
import Box from '@mui/material/Box'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import MenuItem from '@mui/material/MenuItem'
import Paper from '@mui/material/Paper'
import Select, { type SelectChangeEvent } from '@mui/material/Select'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Payments from '@mui/icons-material/Payments'
import CheckCircle from '@mui/icons-material/CheckCircle'
import {
  BottomSheet,
  MobileRow,
  SearchBar,
} from '../../../components/mobile'
import { ConfirmationDialog } from '../../../components/ui'
import { useInfiniteScroll } from '../../../hooks/useInfiniteScroll'
import { useMobileNav } from '../../../layouts/mobile/mobileNav'
import { useAuth } from '../../../hooks/useAuth'
import { usePermissions } from '../../../hooks/usePermissions'
import { useShops } from '../../../hooks/useShops'
import {
  useCreditSummary,
  useCustomerManualCredits,
  useCustomerPayments,
  useInfiniteCreditCustomers,
  useRecordCreditPayment,
  useRecordManualCredit,
} from '../../../hooks/useCredit'
import { useCustomerProfile } from '../../../hooks/useCustomers'
import { getApiErrorMessage } from '../../../lib/errors'
import { formatCurrency, formatDateTime } from '../../../lib/utils'
import {
  CREDIT_PAYMENT_METHOD_LABELS,
  type CreditPaymentMethod,
  type CreditPaymentRecord,
  type ManualCreditRecord,
} from '../../../types/credit'
import type { CustomerRecord } from '../../../types/customers'
import RecordPaymentDialog from '../RecordPaymentDialog'
import ManualCreditDialog from '../ManualCreditDialog'
import type { ManualCreditFormValues, RecordPaymentFormValues } from '../creditSchema'

function SummaryCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <Paper variant="outlined" sx={{ p: 1.5, flex: 1, minWidth: 0 }}>
      <Typography variant="caption" color="text.secondary" noWrap>
        {label}
      </Typography>
      <Typography
        variant="subtitle1"
        sx={{ fontWeight: 700, color: color ?? 'text.primary' }}
        noWrap
      >
        {value}
      </Typography>
    </Paper>
  )
}

export default function MobileCreditBookScreen() {
  const mobileNav = useMobileNav()
  const { profile } = useAuth()
  const permissions = usePermissions()
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [shopId, setShopId] = useState('')
  const [selected, setSelected] = useState<CustomerRecord | null>(null)
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [markPaidOpen, setMarkPaidOpen] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const isSuperAdmin = permissions.isSuperAdmin
  const canManage = permissions.canManageCredit
  const defaultShopId = isSuperAdmin ? shopId : (profile?.shop_id ?? '')

  const shopsQuery = useShops()
  const shops = shopsQuery.data ?? []

  const query = useInfiniteCreditCustomers({ search, shopId: defaultShopId })
  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage, refetch } = query

  const rows = useMemo(() => (data?.pages ?? []).flatMap((page) => page.rows), [data])

  const summaryQuery = useCreditSummary(defaultShopId)

  const recordPayment = useRecordCreditPayment()

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  useEffect(() => {
    mobileNav.setRefresh(() => refetch())
    return () => mobileNav.setRefresh(null)
  }, [mobileNav, refetch])

  const sentinelRef = useInfiniteScroll(
    () => {
      if (hasNextPage && !isFetchingNextPage) fetchNextPage()
    },
    hasNextPage && !isFetchingNextPage,
  )

  const closeSheet = () => {
    setSelected(null)
    setSubmitError(null)
    setActionError(null)
  }

  const handleRecordPayment = async (values: RecordPaymentFormValues) => {
    if (!selected) return
    setSubmitError(null)
    try {
      await recordPayment.mutateAsync({
        customer_id: selected.id,
        amount: values.amount,
        payment_method: values.payment_method,
      })
      setPaymentOpen(false)
    } catch (error) {
      setSubmitError(getApiErrorMessage(error))
    }
  }

  const handleMarkFullyPaid = async () => {
    if (!selected) return
    setActionError(null)
    try {
      await recordPayment.mutateAsync({
        customer_id: selected.id,
        amount: selected.total_credit,
        payment_method: 'cash',
      })
      setMarkPaidOpen(false)
    } catch (error) {
      setActionError(getApiErrorMessage(error))
      setMarkPaidOpen(false)
    }
  }

  return (
    <Box>
      <Stack direction="row" spacing={1.5} sx={{ mb: 1.5 }}>
        <SummaryCard
          label="Outstanding"
          value={formatCurrency(summaryQuery.data?.total_outstanding ?? 0)}
          color="error.main"
        />
        <SummaryCard
          label="Customers"
          value={String(summaryQuery.data?.customer_count ?? 0)}
        />
      </Stack>

      <Box sx={{ mb: 1.5 }}>
        <SearchBar value={searchInput} onChange={setSearchInput} placeholder="Search by name or phone" />
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
          <Typography variant="h6">No outstanding credit</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Customers with balances owing will appear here.
          </Typography>
        </Box>
      ) : (
        <Box>
          {rows.map((customer) => (
            <MobileRow
              key={customer.id}
              accent="warning"
              primary={customer.full_name}
              secondary={customer.phone}
              trailing={
                <Typography variant="body1" sx={{ fontWeight: 700, color: 'error.main' }}>
                  {formatCurrency(customer.total_credit)}
                </Typography>
              }
              onClick={() => setSelected(customer)}
            />
          ))}
          <Box ref={sentinelRef} sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
            {isFetchingNextPage ? <CircularProgress size={24} /> : null}
          </Box>
        </Box>
      )}

      <BottomSheet
        open={selected !== null}
        onClose={closeSheet}
        title={selected?.full_name}
      >
        {selected && (
          <CustomerCreditSheet
            customer={selected}
            canManage={canManage}
            shopName={
              shops.find((shop) => shop.id === selected.shop_id)?.name ?? '—'
            }
            submitError={submitError}
            isRecording={recordPayment.isPending}
            onRecordPayment={() => setPaymentOpen(true)}
            onMarkPaid={() => setMarkPaidOpen(true)}
            onPaymentRecorded={closeSheet}
          />
        )}
      </BottomSheet>

      {selected && (
        <RecordPaymentDialog
          open={paymentOpen}
          customerName={selected.full_name}
          outstanding={selected.total_credit}
          isSubmitting={recordPayment.isPending}
          submitError={submitError}
          onSubmit={handleRecordPayment}
          onClose={() => {
            setPaymentOpen(false)
            setSubmitError(null)
          }}
        />
      )}

      <ConfirmationDialog
        open={markPaidOpen}
        title="Mark fully paid"
        message={`Record a ${formatCurrency(selected?.total_credit ?? 0)} payment to clear ${
          selected?.full_name ?? 'this customer'
        }'s outstanding balance?`}
        confirmLabel="Mark Paid"
        confirmColor="success"
        loading={recordPayment.isPending}
        onConfirm={handleMarkFullyPaid}
        onCancel={() => setMarkPaidOpen(false)}
      />
    </Box>
  )
}

interface CustomerCreditSheetProps {
  customer: CustomerRecord
  canManage: boolean
  shopName: string
  submitError: string | null
  isRecording: boolean
  onRecordPayment: () => void
  onMarkPaid: () => void
  onPaymentRecorded: () => void
}

function CustomerCreditSheet({
  customer,
  canManage,
  shopName,
  submitError,
  isRecording,
  onRecordPayment,
  onMarkPaid,
}: CustomerCreditSheetProps) {
  const [paymentLimit, setPaymentLimit] = useState(15)
  const [manualLimit, setManualLimit] = useState(15)
  const [manualOpen, setManualOpen] = useState(false)
  const [manualError, setManualError] = useState<string | null>(null)
  const profileQuery = useCustomerProfile(customer.id)
  const outstanding = profileQuery.data?.total_credit ?? customer.total_credit

  const paymentsQuery = useCustomerPayments(customer.id, { page: 0, pageSize: paymentLimit })
  const payments = paymentsQuery.data?.rows ?? []

  const manualQuery = useCustomerManualCredits(customer.id, { page: 0, pageSize: manualLimit })
  const manualCredits = manualQuery.data?.rows ?? []

  const recordManual = useRecordManualCredit()

  const hasCredit = outstanding > 0

  const handleManualSubmit = async (values: ManualCreditFormValues) => {
    setManualError(null)
    try {
      await recordManual.mutateAsync({
        customer_id: customer.id,
        amount: values.amount,
        reason: values.reason ? String(values.reason) : undefined,
      })
      setManualOpen(false)
    } catch (error) {
      setManualError(getApiErrorMessage(error))
    }
  }

  return (
    <Box>
      <Paper
        variant="outlined"
        sx={{ p: 2, mb: 2, borderLeft: `3px solid ${hasCredit ? 'error.main' : 'success.main'}` }}
      >
        <Typography variant="caption" color="text.secondary">
          Outstanding Credit
        </Typography>
        <Typography
          variant="h5"
          sx={{ fontWeight: 700, color: hasCredit ? 'error.main' : 'success.main' }}
        >
          {formatCurrency(outstanding)}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {shopName}
        </Typography>
      </Paper>

      {canManage && (
        <Stack spacing={1.5} sx={{ mb: 2 }}>
          {hasCredit && (
            <Stack direction="row" spacing={1.5}>
              <Button
                fullWidth
                variant="contained"
                startIcon={<Payments />}
                onClick={onRecordPayment}
              >
                Record Payment
              </Button>
              <Button
                fullWidth
                variant="outlined"
                color="success"
                startIcon={<CheckCircle />}
                onClick={onMarkPaid}
                disabled={isRecording}
              >
                Mark Paid
              </Button>
            </Stack>
          )}
          <Button
            fullWidth
            variant={hasCredit ? 'text' : 'contained'}
            color="warning"
            onClick={() => setManualOpen(true)}
          >
            Record Manual Credit
          </Button>
        </Stack>
      )}

      <Divider sx={{ mb: 1.5 }} />
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
        Payment History
      </Typography>

      {submitError && (
        <Alert severity="error" sx={{ mb: 1.5 }}>
          {submitError}
        </Alert>
      )}

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
              secondary={`${formatDateTime(payment.created_at)} · ${
                CREDIT_PAYMENT_METHOD_LABELS[payment.payment_method as CreditPaymentMethod]
              }`}
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

      <Divider sx={{ mb: 1.5, mt: 2 }} />
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
        Manual Credits
      </Typography>

      {manualCredits.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No manual credits recorded yet.
        </Typography>
      ) : (
        <Stack>
          {manualCredits.map((credit: ManualCreditRecord) => (
            <MobileRow
              key={credit.id}
              primary={formatCurrency(credit.amount)}
              secondary={
                credit.reason
                  ? `${formatDateTime(credit.created_at)} · ${credit.reason}`
                  : formatDateTime(credit.created_at)
              }
              trailing={
                <Typography
                  variant="caption"
                  sx={{ color: credit.remaining_credit > 0 ? 'error.main' : 'success.main', fontWeight: 600 }}
                >
                  {credit.remaining_credit > 0 ? `${formatCurrency(credit.remaining_credit)} owed` : 'paid'}
                </Typography>
              }
            />
          ))}
          {manualQuery.data && manualQuery.data.count > manualLimit && (
            <Button
              fullWidth
              variant="outlined"
              sx={{ mt: 1 }}
              disabled={manualQuery.isFetching}
              onClick={() => setManualLimit((prev) => prev + 15)}
            >
              {manualQuery.isFetching ? <CircularProgress size={20} /> : 'Load more'}
            </Button>
          )}
        </Stack>
      )}

      <ManualCreditDialog
        open={manualOpen}
        customerName={customer.full_name}
        isSubmitting={recordManual.isPending}
        submitError={manualError}
        onSubmit={handleManualSubmit}
        onClose={() => {
          setManualOpen(false)
          setManualError(null)
        }}
      />
    </Box>
  )
}
