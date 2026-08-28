import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogContent from '@mui/material/DialogContent'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import CheckCircle from '@mui/icons-material/CheckCircle'
import Close from '@mui/icons-material/Close'
import { useMobileNav } from '../../layouts/mobile/mobileNav'
import { useShopDetail } from '../../hooks/useShops'
import type { SaleDetail } from '../../types/sales'
import ReceiptActions from './ReceiptActions'
import ReceiptSheet from './ReceiptSheet'
import MobileTicket from './mobile/MobileTicket'

interface SaleSuccessDialogProps {
  open: boolean
  sale: SaleDetail | null
  onClose: () => void
}

export default function SaleSuccessDialog({ open, sale, onClose }: SaleSuccessDialogProps) {
  const mobileNav = useMobileNav()
  const isMobile = mobileNav.isMobile
  const shopQuery = useShopDetail(sale?.shop_id ?? null)
  const shop = shopQuery.data ?? null

  if (!sale) return null

  if (isMobile) {
    return (
      <>
        <Dialog open={open} onClose={onClose} fullScreen>
          <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: 'background.default' }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 1,
                px: 2,
                py: 1.5,
                borderBottom: 1,
                borderColor: 'divider',
                bgcolor: 'background.paper',
              }}
            >
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <CheckCircle color="success" fontSize="medium" />
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  Sale Complete
                </Typography>
              </Stack>
              <IconButton aria-label="Close" onClick={onClose} sx={{ width: 40, height: 40 }}>
                <Close fontSize="small" />
              </IconButton>
            </Box>

            <Box sx={{ flex: 1, overflowY: 'auto', px: 2, py: 2 }}>
              <Box
                sx={{
                  maxWidth: 380,
                  mx: 'auto',
                  background: '#ffffff',
                  borderRadius: 3,
                  boxShadow: 3,
                  p: 2.5,
                }}
              >
                <MobileTicket sale={sale} shop={shop} />
              </Box>
            </Box>

            <Box
              sx={{
                p: 1.5,
                pt: 1.25,
                pb: 'calc(12px + env(safe-area-inset-bottom))',
                bgcolor: 'background.paper',
                borderTop: 1,
                borderColor: 'divider',
              }}
            >
              <ReceiptActions sale={sale} />
              <Button fullWidth variant="contained" onClick={onClose} sx={{ mt: 1.5 }}>
                Done
              </Button>
            </Box>
          </Box>
        </Dialog>
        <ReceiptSheet sale={sale} shop={shop} forPrint />
      </>
    )
  }

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogContent sx={{ pt: 1, pb: 1 }}>
          <Stack spacing={1.5} sx={{ alignItems: 'center', textAlign: 'center', pb: 1 }}>
            <CheckCircle color="success" fontSize="large" />
            <Typography variant="h6">Sale Complete</Typography>
          </Stack>
          <ReceiptSheet sale={sale} shop={shop} />
          <ReceiptSheet sale={sale} shop={shop} forPrint />
        </DialogContent>
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, pb: 3 }}>
          <ReceiptActions sale={sale} />
          <Button onClick={onClose} variant="contained">
            Done
          </Button>
        </Box>
      </Dialog>
    </>
  )
}
