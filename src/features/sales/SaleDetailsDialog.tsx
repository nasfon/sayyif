import Button from '@mui/material/Button'
import { useState } from 'react'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import Close from '@mui/icons-material/Close'
import EditNote from '@mui/icons-material/EditNote'
import Undo from '@mui/icons-material/Undo'
import Loading from '../../components/feedback/Loading'
import StatusBadge from '../../components/ui/StatusBadge'
import { useSaleDetail, useCorrectSale, useReverseSale } from '../../hooks/useSales'
import { useShopDetail } from '../../hooks/useShops'
import { usePermissions } from '../../hooks/usePermissions'
import { getApiErrorMessage } from '../../lib/errors'
import { formatCurrency, formatDateTime } from '../../lib/utils'
import { PAYMENT_METHOD_LABELS, type SaleStatus } from '../../types/sales'
import ReceiptActions from './ReceiptActions'
import ReceiptSheet from './ReceiptSheet'
import CorrectSaleDialog from './CorrectSaleDialog'
import ReverseSaleDialog from './ReverseSaleDialog'
import SaleAuditTrail from './SaleAuditTrail'

interface SaleDetailsDialogProps {
  saleId: string | null
  onClose: () => void
}

export default function SaleDetailsDialog({ saleId, onClose }: SaleDetailsDialogProps) {
  const { data: sale, isLoading } = useSaleDetail(saleId)
  const shopQuery = useShopDetail(sale?.shop_id ?? null)
  const shop = shopQuery.data ?? null
  const { canCorrectSales, canReverseSales } = usePermissions()

  const [correctOpen, setCorrectOpen] = useState(false)
  const [reverseOpen, setReverseOpen] = useState(false)
  const [correctError, setCorrectError] = useState<string | null>(null)
  const [reverseError, setReverseError] = useState<string | null>(null)

  const correctSale = useCorrectSale()
  const reverseSale = useReverseSale()

  const statusColor = (status: SaleStatus) =>
    status === 'completed' ? 'success' : status === 'corrected' ? 'warning' : 'error'

  const canModify = sale && sale.status !== 'reversed'

  const handleCorrect = (values: { items: { product_id: string; quantity: number }[]; reason: string }) => {
    if (!sale) return
    setCorrectError(null)
    correctSale.mutate(
      { sale_id: sale.id, items: values.items, reason: values.reason },
      {
        onSuccess: () => {
          setCorrectOpen(false)
          onClose()
        },
        onError: (error) => setCorrectError(getApiErrorMessage(error)),
      },
    )
  }

  const handleReverse = (values: { reason: string }) => {
    if (!sale) return
    setReverseError(null)
    reverseSale.mutate(
      { sale_id: sale.id, reason: values.reason },
      {
        onSuccess: () => {
          setReverseOpen(false)
          onClose()
        },
        onError: (error) => setReverseError(getApiErrorMessage(error)),
      },
    )
  }

  return (
    <Dialog open={saleId !== null} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pr: 1 }}>
        <Stack sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            {sale ? sale.receipt_number : 'Sale details'}
          </Typography>
          {sale && (
            <Typography variant="body2" color="text.secondary">
              {formatDateTime(sale.created_at)}
            </Typography>
          )}
        </Stack>
        {sale && <StatusBadge label={sale.status} color={statusColor(sale.status)} />}
        <IconButton aria-label="Close" onClick={onClose}>
          <Close />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ pt: 2.5 }}>
        {isLoading || !sale ? (
          <Loading label="Loading sale details..." />
        ) : (
          <Stack spacing={2.5}>
            <Stack spacing={1}>
              <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">
                  Customer
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {sale.customer_name ?? (sale.customer_id ? 'Customer on file' : 'Walk-in / Guest')}
                </Typography>
              </Stack>
              <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">
                  Payment method
                </Typography>
                <Typography variant="body2">{PAYMENT_METHOD_LABELS[sale.payment_method]}</Typography>
              </Stack>
            </Stack>

            <Divider />

            <Stack spacing={1}>
              <Typography variant="subtitle2">Items</Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Item</TableCell>
                      <TableCell align="right">Qty</TableCell>
                      <TableCell align="right">Unit Price</TableCell>
                      <TableCell align="right">Total</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {sale.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {item.product_name}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2">{item.quantity}</Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2">{formatCurrency(item.unit_price)}</Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2">{formatCurrency(item.total_price)}</Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Stack>

            <Divider />

            <Stack spacing={1}>
              <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">
                  Subtotal
                </Typography>
                <Typography variant="body2">{formatCurrency(sale.subtotal)}</Typography>
              </Stack>
              <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
                <Typography variant="body1">Total</Typography>
                <Typography variant="body1" sx={{ fontWeight: 700 }}>
                  {formatCurrency(sale.total)}
                </Typography>
              </Stack>
              <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">
                  Amount paid
                </Typography>
                <Typography variant="body2">{formatCurrency(sale.amount_paid)}</Typography>
              </Stack>
              {sale.remaining_credit > 0 && (
                <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">
                    Remaining credit
                  </Typography>
                  <Typography variant="body2" color="error.main" sx={{ fontWeight: 600 }}>
                    {formatCurrency(sale.remaining_credit)}
                  </Typography>
                </Stack>
              )}
            </Stack>

            <Divider />

            <Stack spacing={1}>
              <Typography variant="subtitle2">Audit trail</Typography>
              <SaleAuditTrail saleId={sale.id} shopName={shop?.name ?? '—'} />
            </Stack>
          </Stack>
        )}
      </DialogContent>
      <DialogActions sx={{ flexWrap: 'wrap', gap: 1 }}>
        {sale && canModify && (
          <>
            {canCorrectSales && (
              <Button
                startIcon={<EditNote />}
                color="warning"
                onClick={() => setCorrectOpen(true)}
                disabled={correctSale.isPending || reverseSale.isPending}
              >
                Correct
              </Button>
            )}
            {canReverseSales && (
              <Button
                startIcon={<Undo />}
                color="error"
                onClick={() => setReverseOpen(true)}
                disabled={correctSale.isPending || reverseSale.isPending}
              >
                Reverse
              </Button>
            )}
          </>
        )}
        {sale && (
          <>
            <ReceiptActions sale={sale} />
            <ReceiptSheet sale={sale} shop={shop} forPrint />
          </>
        )}
        <Button onClick={onClose} variant="contained">
          Close
        </Button>
      </DialogActions>

      {sale && (
        <>
          <CorrectSaleDialog
            key={correctOpen ? `correct-${sale.id}` : 'correct-closed'}
            open={correctOpen}
            sale={sale}
            isSubmitting={correctSale.isPending}
            submitError={correctError}
            onSubmit={handleCorrect}
            onClose={() => {
              setCorrectOpen(false)
              setCorrectError(null)
            }}
          />
          <ReverseSaleDialog
            open={reverseOpen}
            sale={sale}
            isSubmitting={reverseSale.isPending}
            submitError={reverseError}
            onSubmit={handleReverse}
            onClose={() => {
              setReverseOpen(false)
              setReverseError(null)
            }}
          />
        </>
      )}
    </Dialog>
  )
}