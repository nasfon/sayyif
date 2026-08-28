import { useState } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Print from '@mui/icons-material/Print'
import Image from '@mui/icons-material/Image'
import PictureAsPdf from '@mui/icons-material/PictureAsPdf'
import EditNote from '@mui/icons-material/EditNote'
import Undo from '@mui/icons-material/Undo'
import History from '@mui/icons-material/History'
import Loading from '../../../components/feedback/Loading'
import { useMobileNav } from '../../../layouts/mobile/mobileNav'
import { useSaleDetail, useCorrectSale, useReverseSale } from '../../../hooks/useSales'
import { useShopDetail } from '../../../hooks/useShops'
import { usePermissions } from '../../../hooks/usePermissions'
import { getApiErrorMessage } from '../../../lib/errors'
import { downloadReceiptImage } from '../../../lib/receiptImage'
import { downloadReceiptPdf } from '../../../lib/receiptPdf'
import ReceiptSheet from '../ReceiptSheet'
import MobileTicket from './MobileTicket'
import CorrectSaleDialog from '../CorrectSaleDialog'
import ReverseSaleDialog from '../ReverseSaleDialog'
import SaleAuditTrail from '../SaleAuditTrail'

export default function MobileReceiptScreen() {
  const mobileNav = useMobileNav()
  const saleId = mobileNav.params?.saleId ?? null
  const { data: sale, isLoading, isError } = useSaleDetail(saleId)
  const shopQuery = useShopDetail(sale?.shop_id ?? null)
  const shop = shopQuery.data ?? null
  const { canCorrectSales, canReverseSales } = usePermissions()
  const [pending, setPending] = useState<'pdf' | 'image' | null>(null)
  const [correctOpen, setCorrectOpen] = useState(false)
  const [reverseOpen, setReverseOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [correctError, setCorrectError] = useState<string | null>(null)
  const [reverseError, setReverseError] = useState<string | null>(null)

  const correctSale = useCorrectSale()
  const reverseSale = useReverseSale()

  const handleDownload = async (kind: 'pdf' | 'image') => {
    if (!sale) return
    setPending(kind)
    try {
      if (kind === 'pdf') {
        await downloadReceiptPdf(sale)
      } else {
        await downloadReceiptImage(sale.receipt_number)
      }
    } finally {
      setPending(null)
    }
  }

  const canModify = sale && sale.status !== 'reversed'

  const handleCorrect = (values: { items: { product_id: string; quantity: number }[]; reason: string }) => {
    if (!sale) return
    setCorrectError(null)
    correctSale.mutate(
      { sale_id: sale.id, items: values.items, reason: values.reason },
      {
        onSuccess: () => setCorrectOpen(false),
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
        onSuccess: () => setReverseOpen(false),
        onError: (error) => setReverseError(getApiErrorMessage(error)),
      },
    )
  }

  if (isLoading) {
    return <Loading label="Loading receipt..." />
  }

  if (isError || !sale) {
    return (
      <Box sx={{ py: 8, textAlign: 'center', px: 2 }}>
        <Typography variant="h6">Receipt not found</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          This sale may have been removed or is no longer available.
        </Typography>
      </Box>
    )
  }

  return (
    <Box sx={{ pb: 'calc(84px + env(safe-area-inset-bottom))' }}>
      <Box
        sx={{
          maxWidth: 360,
          mx: 'auto',
          background: '#ffffff',
          borderRadius: 3,
          boxShadow: 3,
          p: 2.5,
          position: 'relative',
        }}
      >
          <Box
            id="receipt-view"
            sx={{ background: '#ffffff', borderRadius: 2, p: 1 }}
          >
            <MobileTicket sale={sale} shop={shop} />
          </Box>
      </Box>

      {(canModify && (canCorrectSales || canReverseSales)) && (
        <Stack spacing={1} sx={{ maxWidth: 360, mx: 'auto', mt: 2, px: 1 }}>
          <Stack direction="row" spacing={1}>
            {canCorrectSales && (
              <Button
                fullWidth
                variant="outlined"
                color="warning"
                startIcon={<EditNote />}
                onClick={() => setCorrectOpen(true)}
                disabled={correctSale.isPending || reverseSale.isPending}
              >
                Correct
              </Button>
            )}
            {canReverseSales && (
              <Button
                fullWidth
                variant="outlined"
                color="error"
                startIcon={<Undo />}
                onClick={() => setReverseOpen(true)}
                disabled={correctSale.isPending || reverseSale.isPending}
              >
                Reverse
              </Button>
            )}
          </Stack>
          <Button
            fullWidth
            variant="text"
            startIcon={<History />}
            onClick={() => setHistoryOpen((prev) => !prev)}
          >
            {historyOpen ? 'Hide history' : 'View history'}
          </Button>
          {historyOpen && (
            <>
              <Divider />
              <SaleAuditTrail saleId={sale.id} shopName={shop?.name ?? '—'} />
            </>
          )}
        </Stack>
      )}

      <ReceiptSheet sale={sale} shop={shop} forPrint />

      <Box
        sx={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 1100,
          display: 'flex',
          gap: 1,
          p: 1.5,
          pt: 1.25,
          pb: 'calc(12px + env(safe-area-inset-bottom))',
          bgcolor: 'background.paper',
          borderTop: 1,
          borderColor: 'divider',
        }}
      >
        <Button fullWidth variant="contained" startIcon={<Print />} onClick={() => window.print()}>
          Print
        </Button>
        <Button
          fullWidth
          variant="outlined"
          startIcon={pending === 'image' ? <CircularProgress size={16} /> : <Image />}
          onClick={() => handleDownload('image')}
          disabled={pending !== null}
        >
          Save PNG
        </Button>
        <Button
          fullWidth
          variant="outlined"
          startIcon={pending === 'pdf' ? <CircularProgress size={16} /> : <PictureAsPdf />}
          onClick={() => handleDownload('pdf')}
          disabled={pending !== null}
        >
          PDF
        </Button>
      </Box>

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
    </Box>
  )
}
