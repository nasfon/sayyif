import { lazy, Suspense, useState, type ComponentType } from 'react'
import type { SvgIconProps } from '@mui/material/SvgIcon'
import AccountBalanceWallet from '@mui/icons-material/AccountBalanceWallet'
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
import Paper from '@mui/material/Paper'
import Select, { type SelectChangeEvent } from '@mui/material/Select'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import Loading from '../../components/feedback/Loading'
import PageHeader from '../../components/ui/PageHeader'
import { useAuth } from '../../hooks/useAuth'
import { useReportSummary } from '../../hooks/useReports'
import { useShops } from '../../hooks/useShops'
import { useMobileNav } from '../../layouts/mobile/mobileNav'
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

function ReportStatCard({ icon: Icon, label, value, caption, color }: ReportCard) {
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
          <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
            {label}
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.25 }} noWrap>
            {value}
          </Typography>
          {caption && (
            <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
              {caption}
            </Typography>
          )}
        </Box>
      </Stack>
    </Paper>
  )
}

interface AppliedFilters {
  shopId: string
  dateFrom: string
  dateTo: string
}

const MobileReportsScreen = lazy(() => import('./MobileReportsScreen'))

export default function ReportsPage() {
  const { profile } = useAuth()
  const shopsQuery = useShops()
  const shops = shopsQuery.data ?? []
  const mobileNav = useMobileNav()
  const isMobile = mobileNav.isMobile

  const isSuperAdmin = profile?.role === 'super_admin'
  const defaultShopId = isSuperAdmin ? '' : (profile?.shop_id ?? '')

  const [draftShop, setDraftShop] = useState(defaultShopId)
  const [draftFrom, setDraftFrom] = useState('')
  const [draftTo, setDraftTo] = useState('')
  const [applied, setApplied] = useState<AppliedFilters>({
    shopId: defaultShopId,
    dateFrom: '',
    dateTo: '',
  })
  const [exporting, setExporting] = useState<'pdf' | null>(null)

  const reportQuery = useReportSummary(
    isSuperAdmin ? (applied.shopId || undefined) : (profile?.shop_id ?? undefined),
    applied.dateFrom || undefined,
    applied.dateTo || undefined,
  )
  const report = reportQuery.data

  if (isMobile) {
    return (
      <Suspense fallback={<Loading />}>
        <MobileReportsScreen />
      </Suspense>
    )
  }

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
          label: 'Sales Report',
          value: String(report.sales_count),
          caption: `Revenue: ${formatCurrency(report.sales_total)}`,
          color: 'primary',
        },
        {
          icon: Payments,
          label: 'Revenue Report',
          value: formatCurrency(report.sales_total),
          caption: `Net profit: ${formatCurrency(report.net_profit)}`,
          color: 'success',
        },
        {
          icon: Savings,
          label: 'Expenses Report',
          value: formatCurrency(report.expenses_total),
          caption: `Net profit: ${formatCurrency(report.net_profit)}`,
          color: 'warning',
        },
        {
          icon: AccountBalanceWallet,
          label: 'Credit Report',
          value: formatCurrency(report.credit_outstanding),
          caption: `Collected: ${formatCurrency(report.credit_collected)}`,
          color: 'error',
        },
        {
          icon: Inventory2,
          label: 'Inventory Report',
          value: String(report.products_total),
          caption: `Value: ${formatCurrency(report.inventory_value)} · Low: ${report.low_stock_count}`,
          color: 'info',
        },
      ]
    : []

  const handleGenerate = () => {
    setApplied({ shopId: draftShop, dateFrom: draftFrom, dateTo: draftTo })
  }

  const handlePrint = () => {
    window.print()
  }

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

  const actions = (
    <>
      <Button variant="outlined" startIcon={<Print />} onClick={handlePrint} disabled={!report}>
        Print
      </Button>
      <Button
        variant="contained"
        startIcon={exporting === 'pdf' ? <CircularProgress size={16} color="inherit" /> : <PictureAsPdf />}
        onClick={handleDownloadPdf}
        disabled={!report || exporting !== null}
      >
        Download PDF
      </Button>
    </>
  )

  return (
    <Box>
      <PageHeader title="Reports" subtitle="Sales, revenue, expenses, credit, and inventory summary" actions={actions} />

      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ flexWrap: 'wrap', alignItems: 'flex-end' }}>
          {isSuperAdmin && (
            <Box sx={{ minWidth: 200 }}>
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
          />
          <TextField
            label="To"
            type="date"
            size="small"
            value={draftTo}
            onChange={(event) => setDraftTo(event.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <Button variant="contained" onClick={handleGenerate} sx={{ minWidth: 130 }}>
            Generate
          </Button>
        </Stack>
      </Paper>

      {reportQuery.isError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {getApiErrorMessage(reportQuery.error)}
        </Alert>
      )}

      {reportQuery.isLoading ? (
        <Loading label="Generating report..." />
      ) : (
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ flexWrap: 'wrap' }}>
          {cards.map((card) => (
            <ReportStatCard key={card.label} {...card} />
          ))}
        </Stack>
      )}

      {report && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
          Period: {dateLabel} · Scope: {scopeLabel} · Generated {formatDateTime(new Date())}
        </Typography>
      )}

      {report && (
        <ReportPrintArea
          report={report}
          scopeLabel={scopeLabel}
          dateLabel={dateLabel}
          generatedAt={formatDateTime(new Date())}
        />
      )}
    </Box>
  )
}
