import { useCallback, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import PointOfSale from '@mui/icons-material/PointOfSale'
import ReceiptLong from '@mui/icons-material/ReceiptLong'
import ShoppingCartCheckout from '@mui/icons-material/ShoppingCartCheckout'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import StatusBadge from '../../components/ui/StatusBadge'
import EmptyState from '../../components/ui/EmptyState'
import { MobileRow, MobileStatCard } from '../../components/mobile'
import { useAuth } from '../../hooks/useAuth'
import { useCashierDashboard } from '../../hooks/useDashboard'
import { useMobileNav } from '../../layouts/mobile/mobileNav'
import type { PageKey } from '../../layouts/navigation'
import { formatCurrency, formatTime } from '../../lib/utils'
import type { SaleStatus } from '../../types/sales'

const SALE_STATUS_COLORS: Record<SaleStatus, 'success' | 'warning' | 'error'> = {
  completed: 'success',
  corrected: 'warning',
  reversed: 'error',
}

interface CashierHomeProps {
  onNavigate?: (key: PageKey) => void
}

export default function CashierHome({ onNavigate }: CashierHomeProps) {
  const { profile } = useAuth()
  const mobileNav = useMobileNav()
  const isMobile = mobileNav.isMobile
  const queryClient = useQueryClient()
  const { data } = useCashierDashboard()

  const salesToday = data?.sales_today ?? 0
  const recent = data?.recent_sales ?? []
  const firstName = profile?.full_name?.split(' ')[0] ?? 'there'

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['dashboard', 'cashier'] })
  }, [queryClient])

  useEffect(() => {
    if (!isMobile) return
    mobileNav.setRefresh(refresh)
    return () => mobileNav.setRefresh(null)
  }, [isMobile, mobileNav, refresh])

  return (
    <Box>
      <Stack spacing={2}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
            {`Hi ${firstName}`}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Ready to ring up a sale?
          </Typography>
        </Box>

        <Button
          variant="contained"
          size="large"
          startIcon={<PointOfSale />}
          onClick={() => onNavigate?.('sales')}
          sx={{
            width: '100%',
            py: 2.5,
            fontSize: '1.25rem',
            fontWeight: 700,
            borderRadius: 2,
            boxShadow: 3,
          }}
        >
          New Sale
        </Button>

        <Box sx={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: 1.5 }}>
          {isMobile ? (
            <MobileStatCard
              icon={ShoppingCartCheckout}
              label="Sales Today"
              value={String(salesToday)}
              color="success"
            />
          ) : (
            <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
              <ShoppingCartCheckout color="success" sx={{ fontSize: 32, mb: 0.5 }} />
              <Typography variant="caption" color="text.secondary">
                Sales Today
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 800 }}>
                {String(salesToday)}
              </Typography>
            </Paper>
          )}
        </Box>

        <Box>
          <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Recent Transactions
            </Typography>
            <ReceiptLong color="action" fontSize="small" />
          </Stack>

          {recent.length === 0 ? (
            <EmptyState
              title="No transactions yet"
              description="Sales you record will appear here."
            />
          ) : isMobile ? (
            recent.map((sale) => (
              <MobileRow
                key={sale.id}
                accent={SALE_STATUS_COLORS[sale.status]}
                primary={sale.receipt_number}
                secondary={`${formatTime(sale.created_at)} · ${sale.payment_method}`}
                trailing={
                  <Typography variant="body1" sx={{ fontWeight: 700 }}>
                    {formatCurrency(sale.total)}
                  </Typography>
                }
              />
            ))
          ) : (
            <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
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
                    {recent.map((sale) => (
                      <TableRow key={sale.id} hover>
                        <TableCell sx={{ fontWeight: 600 }}>{sale.receipt_number}</TableCell>
                        <TableCell>{formatTime(sale.created_at)}</TableCell>
                        <TableCell>{sale.payment_method}</TableCell>
                        <TableCell align="right">{formatCurrency(sale.total)}</TableCell>
                        <TableCell>
                          <StatusBadge label={sale.status} color={SALE_STATUS_COLORS[sale.status]} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          )}
        </Box>
      </Stack>
    </Box>
  )
}
