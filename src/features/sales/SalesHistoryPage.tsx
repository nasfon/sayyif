import { useEffect, useState } from 'react'
import type { ColumnDef, PaginationState } from '@tanstack/react-table'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import InputAdornment from '@mui/material/InputAdornment'
import MenuItem from '@mui/material/MenuItem'
import Select, { type SelectChangeEvent } from '@mui/material/Select'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import Search from '@mui/icons-material/Search'
import Visibility from '@mui/icons-material/Visibility'
import DataTable from '../../components/data/DataTable'
import { type TableFeatures } from '../../components/data/table'
import PageHeader from '../../components/ui/PageHeader'
import StatusBadge from '../../components/ui/StatusBadge'
import { useAuth } from '../../hooks/useAuth'
import { useShops } from '../../hooks/useShops'
import { useSalesList } from '../../hooks/useSales'
import { formatCurrency, formatDate, formatDateTime } from '../../lib/utils'
import type { PaymentMethod, SaleListRow, SaleStatus } from '../../types/sales'
import { PAYMENT_METHOD_LABELS } from '../../types/sales'
import SaleDetailsDialog from './SaleDetailsDialog'
import { useMobileNav } from '../../layouts/mobile/mobileNav'
import { MobileList, MobileRow } from '../../components/mobile/MobileList'

export default function SalesHistoryPage() {
  const { profile } = useAuth()
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 })
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [shopFilter, setShopFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<SaleStatus | ''>('')
  const [paymentFilter, setPaymentFilter] = useState<PaymentMethod | ''>('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const mobileNav = useMobileNav()
  const isMobile = mobileNav.isMobile
  const [mobileLimit, setMobileLimit] = useState(15)

  const isSuperAdmin = profile?.role === 'super_admin'
  const defaultShopId = isSuperAdmin ? '' : (profile?.shop_id ?? '')

  const listPage = isMobile ? 0 : pagination.pageIndex
  const listPageSize = isMobile ? mobileLimit : pagination.pageSize

  const { data, isLoading } = useSalesList({
    page: listPage,
    pageSize: listPageSize,
    search,
    shopId: isSuperAdmin ? shopFilter : defaultShopId,
    status: statusFilter,
    paymentMethod: paymentFilter,
    dateFrom,
    dateTo,
  })
  const shopsQuery = useShops()
  const shops = shopsQuery.data ?? []
  const shopName = (shopId: string) => shops.find((shop) => shop.id === shopId)?.name ?? '—'

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim())
      setPagination((prev) => ({ ...prev, pageIndex: 0 }))
    }, 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  const resetPage = () => setPagination((prev) => ({ ...prev, pageIndex: 0 }))

  const statusColor = (status: SaleStatus) =>
    status === 'completed' ? 'success' : status === 'corrected' ? 'warning' : 'error'

  const columns: ColumnDef<TableFeatures, SaleListRow, unknown>[] = []

  if (isSuperAdmin) {
    columns.push({
      accessorKey: 'shop_id',
      header: 'Shop',
      cell: (info) => <Typography variant="body2">{shopName(info.getValue<string>())}</Typography>,
    })
  }

  columns.push(
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
      id: 'customer',
      header: 'Customer',
      cell: (info) => {
        const name = info.row.original.customer_name
        return (
          <Typography variant="body2" color={name ? 'text.primary' : 'text.secondary'}>
            {name ?? 'Walk-in / Guest'}
          </Typography>
        )
      },
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
      header: 'Paid',
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
        return <StatusBadge label={status} color={statusColor(status)} />
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: (info) => (
        <Button size="small" startIcon={<Visibility />} onClick={() => setSelectedId(info.row.original.id)}>
          View
        </Button>
      ),
    },
  )

  return (
    <Box>
      <PageHeader title="Sales History" subtitle="Browse past sales, filter by date, payment, and status" />

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2, flexWrap: 'wrap' }}>
        <TextField
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder="Search receipt or customer"
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            },
          }}
          sx={{ flex: 1, minWidth: 240 }}
        />
        {isSuperAdmin && (
          <Select
            value={shopFilter}
            onChange={(event: SelectChangeEvent<string>) => {
              setShopFilter(event.target.value)
              resetPage()
            }}
            displayEmpty
            sx={{ minWidth: 180 }}
          >
            <MenuItem value="">All shops</MenuItem>
            {shops.map((shop) => (
              <MenuItem key={shop.id} value={shop.id}>
                {shop.name}
              </MenuItem>
            ))}
          </Select>
        )}
        <Select
          value={statusFilter}
          onChange={(event: SelectChangeEvent<SaleStatus | ''>) => {
            setStatusFilter(event.target.value as SaleStatus | '')
            resetPage()
          }}
          displayEmpty
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="">All statuses</MenuItem>
          <MenuItem value="completed">Completed</MenuItem>
          <MenuItem value="corrected">Corrected</MenuItem>
          <MenuItem value="reversed">Reversed</MenuItem>
        </Select>
        <Select
          value={paymentFilter}
          onChange={(event: SelectChangeEvent<PaymentMethod | ''>) => {
            setPaymentFilter(event.target.value as PaymentMethod | '')
            resetPage()
          }}
          displayEmpty
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="">All payments</MenuItem>
          {(Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[]).map((method) => (
            <MenuItem key={method} value={method}>
              {PAYMENT_METHOD_LABELS[method]}
            </MenuItem>
          ))}
        </Select>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <TextField
            label="From"
            type="date"
            size="small"
            value={dateFrom}
            onChange={(event) => {
              setDateFrom(event.target.value)
              resetPage()
            }}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField
            label="To"
            type="date"
            size="small"
            value={dateTo}
            onChange={(event) => {
              setDateTo(event.target.value)
              resetPage()
            }}
            slotProps={{ inputLabel: { shrink: true } }}
          />
        </Stack>
      </Stack>

      {isMobile ? (
        <MobileList<SaleListRow>
          items={data?.rows ?? []}
          getKey={(row) => row.id}
          loading={isLoading}
          emptyTitle="No sales found"
          emptyDescription="Try adjusting your search or filters."
          hasMore={!!data && data.count > mobileLimit}
          onLoadMore={() => setMobileLimit((prev) => prev + 15)}
          loadingMore={isLoading}
          renderRow={(row) => (
            <MobileRow
              accent={statusColor(row.status)}
              primary={row.receipt_number}
              secondary={`${row.customer_name ?? 'Walk-in'} · ${formatDate(row.created_at)}`}
              trailing={
                <Stack>
                  <Typography variant="body1" sx={{ fontWeight: 700 }}>
                    {formatCurrency(row.total)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {PAYMENT_METHOD_LABELS[row.payment_method]}
                  </Typography>
                </Stack>
              }
              onClick={() => mobileNav.navigate('receipt', { saleId: row.id })}
            />
          )}
        />
      ) : (
        <DataTable<SaleListRow>
          columns={columns}
          data={data?.rows ?? []}
          getRowId={(row) => row.id}
          loading={isLoading}
          rowCount={data?.count ?? 0}
          pagination={pagination}
          onPaginationChange={setPagination}
          emptyTitle="No sales found"
          emptyDescription="Try adjusting your search or filters."
        />
      )}

      <SaleDetailsDialog saleId={selectedId} onClose={() => setSelectedId(null)} />
    </Box>
  )
}