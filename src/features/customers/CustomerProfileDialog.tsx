import { useState } from 'react'
import type { ColumnDef, PaginationState } from '@tanstack/react-table'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import CalendarMonth from '@mui/icons-material/CalendarMonth'
import Close from '@mui/icons-material/Close'
import Edit from '@mui/icons-material/Edit'
import EmailOutlined from '@mui/icons-material/EmailOutlined'
import PlaceOutlined from '@mui/icons-material/PlaceOutlined'
import Storefront from '@mui/icons-material/Storefront'
import type { ReactNode } from 'react'
import DataTable from '../../components/data/DataTable'
import type { TableFeatures } from '../../components/data/table'
import StatusBadge from '../../components/ui/StatusBadge'
import { useCustomerPurchaseHistory, useCustomerPurchaseTotals } from '../../hooks/useCustomers'
import { formatCurrency, formatDate, formatDateTime } from '../../lib/utils'
import type { CustomerRecord } from '../../types/customers'
import { PAYMENT_METHOD_LABELS, type PaymentMethod, type SaleRecord, type SaleStatus } from '../../types/sales'

interface CustomerProfileDialogProps {
  customer: CustomerRecord
  shopName?: string
  onClose: () => void
  onEdit?: () => void
}

function InfoItem({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, minWidth: 180 }}>
      <Box sx={{ color: 'text.secondary', display: 'flex', mt: 0.4 }}>{icon}</Box>
      <Box>
        <Typography variant="caption" color="text.secondary">
          {label}
        </Typography>
        <Typography variant="body2">{value}</Typography>
      </Box>
    </Box>
  )
}

function StatCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <Paper variant="outlined" sx={{ p: 2, flex: 1, minWidth: 180 }}>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="h6" sx={{ color: color ?? 'text.primary', fontWeight: 700 }}>
        {value}
      </Typography>
    </Paper>
  )
}

export default function CustomerProfileDialog({
  customer,
  shopName,
  onClose,
  onEdit,
}: CustomerProfileDialogProps) {
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 })
  const historyQuery = useCustomerPurchaseHistory(customer.id, {
    page: pagination.pageIndex,
    pageSize: pagination.pageSize,
  })
  const totalsQuery = useCustomerPurchaseTotals(customer.shop_id, customer.id)
  const purchaseTotals = totalsQuery.data?.[0]

  const columns: ColumnDef<TableFeatures, SaleRecord, unknown>[] = [
    {
      accessorKey: 'receipt_number',
      header: 'Receipt',
      cell: (info) => (
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {info.getValue<string>()}
        </Typography>
      ),
    },
    {
      accessorKey: 'created_at',
      header: 'Date',
      cell: (info) => <Typography variant="body2">{formatDateTime(info.getValue<string>())}</Typography>,
    },
    {
      accessorKey: 'payment_method',
      header: 'Payment',
      cell: (info) => (
        <Typography variant="body2">{PAYMENT_METHOD_LABELS[info.getValue<PaymentMethod>()]}</Typography>
      ),
    },
    {
      accessorKey: 'total',
      header: 'Total',
      cell: (info) => <Typography variant="body2">{formatCurrency(info.getValue<number>())}</Typography>,
    },
    {
      accessorKey: 'amount_paid',
      header: 'Amount Paid',
      cell: (info) => <Typography variant="body2">{formatCurrency(info.getValue<number>())}</Typography>,
    },
    {
      accessorKey: 'remaining_credit',
      header: 'Remaining',
      cell: (info) => {
        const value = info.getValue<number>()
        return (
          <Typography variant="body2" color={value > 0 ? 'error.main' : 'text.secondary'}>
            {formatCurrency(value)}
          </Typography>
        )
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: (info) => {
        const status = info.getValue<SaleStatus>()
        const color = status === 'completed' ? 'success' : status === 'corrected' ? 'warning' : 'error'
        return <StatusBadge label={status} color={color} />
      },
    },
  ]

  return (
    <Dialog open onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pr: 1 }}>
        <Avatar sx={{ bgcolor: 'primary.main' }}>{customer.full_name.charAt(0).toUpperCase()}</Avatar>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            {customer.full_name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {customer.phone}
          </Typography>
        </Box>
        {onEdit && (
          <Button startIcon={<Edit />} onClick={onEdit}>
            Edit
          </Button>
        )}
        <IconButton aria-label="Close" onClick={onClose}>
          <Close />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ pt: 2.5 }}>
        <Stack spacing={2.5}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ flexWrap: 'wrap' }}>
            <InfoItem icon={<EmailOutlined fontSize="small" />} label="Email" value={customer.email ?? '—'} />
            <InfoItem icon={<PlaceOutlined fontSize="small" />} label="Address" value={customer.address ?? '—'} />
            <InfoItem icon={<Storefront fontSize="small" />} label="Shop" value={shopName ?? '—'} />
            <InfoItem
              icon={<CalendarMonth fontSize="small" />}
              label="Member since"
              value={formatDate(customer.created_at)}
            />
          </Stack>

          <Divider />

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <StatCard
              label="Outstanding Credit"
              value={formatCurrency(customer.total_credit)}
              color={customer.total_credit > 0 ? 'error.main' : 'success.main'}
            />
            <StatCard
              label="Total Purchases"
              value={purchaseTotals ? String(purchaseTotals.purchase_count) : '—'}
            />
            <StatCard
              label="Total Spent"
              value={purchaseTotals ? formatCurrency(purchaseTotals.total_spent) : formatCurrency(0)}
            />
          </Stack>

          <Divider />

          <Stack>
            <Typography variant="h6">Purchase History</Typography>
            <Typography variant="body2" color="text.secondary">
              All sales recorded against this customer.
            </Typography>
          </Stack>

          <DataTable<SaleRecord>
            columns={columns}
            data={historyQuery.data?.rows ?? []}
            getRowId={(row) => row.id}
            loading={historyQuery.isLoading}
            rowCount={historyQuery.data?.count ?? 0}
            pagination={pagination}
            onPaginationChange={setPagination}
            emptyTitle="No purchases yet"
            emptyDescription="Sales made to this customer will appear here."
          />
        </Stack>
      </DialogContent>
    </Dialog>
  )
}