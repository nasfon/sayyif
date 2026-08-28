import { useState, type ComponentType } from 'react'
import type { SvgIconProps } from '@mui/material/SvgIcon'
import AccountBalanceWallet from '@mui/icons-material/AccountBalanceWallet'
import FilterAlt from '@mui/icons-material/FilterAlt'
import Inventory2 from '@mui/icons-material/Inventory2'
import Payments from '@mui/icons-material/Payments'
import PictureAsPdf from '@mui/icons-material/PictureAsPdf'
import Print from '@mui/icons-material/Print'
import Savings from '@mui/icons-material/Savings'
import ShoppingCartCheckout from '@mui/icons-material/ShoppingCartCheckout'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import MenuItem from '@mui/material/MenuItem'
import Select, { type SelectChangeEvent } from '@mui/material/Select'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import BottomSheet from '../../components/mobile/BottomSheet'
import Loading from '../../components/feedback/Loading'
import MobileStatCard from '../../components/mobile/MobileStatCard'
import { useAuth } from '../../hooks/useAuth'
import { useReportSummary } from '../../hooks/useReports'
import { useShops } from '../../hooks/useShops'
import { getApiErrorMessage } from '../../lib/errors'
import { downloadReportPdf } from '../../lib/reportPdf'
import { formatCurrency, formatDate, formatDateTime } from '../../lib/utils'
import { ReportPrintArea } from './ReportDocument'

interface ReportCard {
  icon: ComponentType<SvgIconProps>
  label: string
  value: string
  caption?: string
  color: 'primary' | 'success' | 'warning' | 'error' | 'secondary' | 'info'
}

export default function MobileReportsScreen() {
  const { profile } = useAuth()
  const shopsQuery = useShops()
  const shops = shopsQuery.data ?? []

  const isSuperAdmin = profile?.role === 'super_admin'
  const defaultShopId = isSuperAdmin ? '' : (profile?.shop_id ?? '')

  const [filterOpen, setFilterOpen] = useState(false)
  const [draftShop, setDraftShop] = useState(defaultShopId)
  const [draftFrom, setDraftFrom] = useState('')
  const [draftTo, setDraftTo] = useState('')
  const [applied, setApplied] = useState({ shopId: defaultShopId, dateFrom: '', dateTo: '' })
  const [exporting, setExporting] = useState<'pdf' | null>(null)

  const reportQuery = useReportSummary(
    isSuperAdmin ? (applied.shopId || undefined) : (profile?.shop_id ?? undefined),
    applied.dateFrom || undefined,
    applied.dateTo || undefined,
  )
  const report = reportQuery.data

  const scopeLabel = isSuperAdmin
    ? applied.shopId
      ? (shops.find((shop) => shop.id === applied.shopId)?.name ?? 'All Shops')
      : 'All Shops'
    : (shops.find((shop) => shop.id === profile?.shop_id)?.name ?? 'Business')

  const dateLabel = applied.dateFrom && applied.dateTo
    ? `${formatDate(applied.dateFrom)} – ${formatDate(applied.dateTo)}`
    : applied.dateFrom
      ? `From ${formatDate(applied.dateFrom)}`
      : applied.dateTo
        ? `Up to ${formatDate(applied.dateTo)}`
        : 'All time'

  const cards: ReportCard[] = report
    ? [
        {
          icon: ShoppingCartCheckout,
          label: 'Sales',
          value: String(report.sales_count),
          caption: `Rev: ${formatCurrency(report.sales_total)}`,
          color: 'primary',
        },
        {
          icon: Payments,
          label: 'Revenue',
          value: formatCurrency(report.sales_total),
          caption: `Profit: ${formatCurrency(report.net_profit)}`,
          color: 'success',
        },
        {
          icon: Savings,
          label: 'Expenses',
          value: formatCurrency(report.expenses_total),
          caption: `Profit: ${formatCurrency(report.net_profit)}`,
          color: 'warning',
        },
        {
          icon: AccountBalanceWallet,
          label: 'Credit',
          value: formatCurrency(report.credit_outstanding),
          caption: `Collected: ${formatCurrency(report.credit_collected)}`,
          color: 'error',
        },
        {
          icon: Inventory2,
          label: 'Inventory',
          value: String(report.products_total),
          caption: `Low: ${report.low_stock_count}`,
          color: 'info',
        },
      ]
    : []

  const handleApply = () => {
    setApplied({ shopId: draftShop, dateFrom: draftFrom, dateTo: draftTo })
    setFilterOpen(false)
  }

  const handlePrint = () => window.print()

  const handleDownloadPdf = async () => {
    const node = document.querySelector('.report-print-area') as HTMLElement | null
    if (!node) return
    setExporting('pdf')
    try {
      await downloadReportPdf(node, 'ims-report.pdf')
    } finally {
      setExporting(null)
    }
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
        <Button variant="outlined" startIcon={<FilterAlt />} onClick={() => setFilterOpen(true)} sx={{ flex: 1 }}>
          Filter
        </Button>
        <Button variant="outlined" startIcon={<Print />} onClick={handlePrint} disabled={!report} sx={{ flex: 1 }}>
          Print
        </Button>
        <Button
          variant="contained"
          startIcon={exporting === 'pdf' ? <CircularProgress size={16} color="inherit" /> : <PictureAsPdf />}
          onClick={handleDownloadPdf}
          disabled={!report || exporting !== null}
          sx={{ flex: 1 }}
        >
          PDF
        </Button>
      </Box>

      <Typography variant="caption" color="text.secondary">
        {scopeLabel} · {dateLabel}
      </Typography>

      {reportQuery.isError && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {getApiErrorMessage(reportQuery.error)}
        </Alert>
      )}

      {reportQuery.isLoading ? (
        <Loading label="Generating report..." />
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr' }, gap: 1.5, mt: 2 }}>
          {cards.map((card) => (
            <MobileStatCard
              key={card.label}
              icon={card.icon}
              label={card.label}
              value={card.value}
              caption={card.caption}
              color={card.color}
            />
          ))}
        </Box>
      )}

      {report && (
        <ReportPrintArea
          report={report}
          scopeLabel={scopeLabel}
          dateLabel={dateLabel}
          generatedAt={formatDateTime(new Date())}
        />
      )}

      <BottomSheet
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        title="Report Filters"
        footer={
          <Button variant="contained" fullWidth onClick={handleApply}>
            Apply
          </Button>
        }
      >
        <Stack spacing={2}>
          {isSuperAdmin && (
            <Box>
              <Typography variant="caption" color="text.secondary">
                Shop
              </Typography>
              <Select
                value={draftShop}
                onChange={(event: SelectChangeEvent<string>) => setDraftShop(event.target.value)}
                displayEmpty
                size="small"
                fullWidth
              >
                <MenuItem value="">All shops</MenuItem>
                {shops.map((shop) => (
                  <MenuItem key={shop.id} value={shop.id}>
                    {shop.name}
                  </MenuItem>
                ))}
              </Select>
            </Box>
          )}
          <TextField
            label="From"
            type="date"
            size="small"
            value={draftFrom}
            onChange={(event) => setDraftFrom(event.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
            fullWidth
          />
          <TextField
            label="To"
            type="date"
            size="small"
            value={draftTo}
            onChange={(event) => setDraftTo(event.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
            fullWidth
          />
        </Stack>
      </BottomSheet>
    </Box>
  )
}
