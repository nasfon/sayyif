import { lazy, Suspense, useEffect, useState } from 'react'
import type { ColumnDef, PaginationState } from '@tanstack/react-table'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import InputAdornment from '@mui/material/InputAdornment'
import MenuItem from '@mui/material/MenuItem'
import Paper from '@mui/material/Paper'
import Select, { type SelectChangeEvent } from '@mui/material/Select'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import Loading from '../../components/feedback/Loading'
import Search from '@mui/icons-material/Search'
import Visibility from '@mui/icons-material/Visibility'
import DataTable from '../../components/data/DataTable'
import type { TableFeatures } from '../../components/data/table'
import PageHeader from '../../components/ui/PageHeader'
import { formatCurrency } from '../../lib/utils'
import { useAuth } from '../../hooks/useAuth'
import { useMobileNav } from '../../layouts/mobile/mobileNav'
import { useShops } from '../../hooks/useShops'
import { useCreditSummary, useCustomersWithCredit } from '../../hooks/useCredit'
import type { CustomerRecord } from '../../types/customers'
import CreditCustomerDialog from './CreditCustomerDialog'

const MobileCreditBookScreen = lazy(() => import('./mobile/MobileCreditBookScreen'))

export default function CreditBookPage() {
  const mobileNav = useMobileNav()
  const isMobile = mobileNav.isMobile
  const { profile } = useAuth()

  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 })
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [shopFilter, setShopFilter] = useState('')
  const [selected, setSelected] = useState<CustomerRecord | null>(null)

  const isSuperAdmin = profile?.role === 'super_admin'
  const shopId = isSuperAdmin ? shopFilter : (profile?.shop_id ?? '')
  const shopsQuery = useShops()
  const shops = shopsQuery.data ?? []
  const shopName = (id: string) => shops.find((shop) => shop.id === id)?.name ?? '—'

  const { data, isLoading } = useCustomersWithCredit({
    page: pagination.pageIndex,
    pageSize: pagination.pageSize,
    search,
    shopId: isSuperAdmin ? shopFilter : undefined,
  })
  const summaryQuery = useCreditSummary(shopId)

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim())
      setPagination((prev) => ({ ...prev, pageIndex: 0 }))
    }, 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  if (isMobile) {
    return (
      <Suspense fallback={<Loading />}>
        <MobileCreditBookScreen />
      </Suspense>
    )
  }

  const columns: ColumnDef<TableFeatures, CustomerRecord, unknown>[] = [
    {
      accessorKey: 'full_name',
      header: 'Name',
      cell: (info) => (
        <Stack>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {info.getValue<string>()}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {info.row.original.phone}
          </Typography>
        </Stack>
      ),
    },
    {
      accessorKey: 'total_credit',
      header: 'Outstanding Credit',
      cell: (info) => (
        <Typography variant="body2" sx={{ color: 'error.main', fontWeight: 600 }}>
          {formatCurrency(info.getValue<number>())}
        </Typography>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: (info) => (
        <Button size="small" startIcon={<Visibility />} onClick={() => setSelected(info.row.original)}>
          View
        </Button>
      ),
    },
  ]

  return (
    <Box>
      <PageHeader title="Credit Book" subtitle="Track outstanding customer balances and payments" />

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
        <TextField
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder="Search by name or phone"
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
              setPagination((prev) => ({ ...prev, pageIndex: 0 }))
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
      </Stack>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
        <Paper variant="outlined" sx={{ p: 2, flex: 1, minWidth: 180 }}>
          <Typography variant="caption" color="text.secondary">
            Total Outstanding
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 700, color: 'error.main' }}>
            {formatCurrency(summaryQuery.data?.total_outstanding ?? 0)}
          </Typography>
        </Paper>
        <Paper variant="outlined" sx={{ p: 2, flex: 1, minWidth: 180 }}>
          <Typography variant="caption" color="text.secondary">
            Customers Owing
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            {summaryQuery.data?.customer_count ?? '—'}
          </Typography>
        </Paper>
      </Stack>

      <DataTable<CustomerRecord>
        columns={columns}
        data={data?.rows ?? []}
        getRowId={(row) => row.id}
        loading={isLoading}
        rowCount={data?.count ?? 0}
        pagination={pagination}
        onPaginationChange={setPagination}
        emptyTitle="No outstanding credit"
        emptyDescription="Customers with balances owing will appear here."
      />

      {selected && (
        <CreditCustomerDialog
          customer={selected}
          shopName={shopName(selected.shop_id)}
          onClose={() => setSelected(null)}
        />
      )}
    </Box>
  )
}