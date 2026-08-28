import { lazy, Suspense, useEffect, useState } from 'react'
import type { ColumnDef, PaginationState } from '@tanstack/react-table'
import Box from '@mui/material/Box'
import InputAdornment from '@mui/material/InputAdornment'
import Loading from '../../components/feedback/Loading'
import MenuItem from '@mui/material/MenuItem'
import Select, { type SelectChangeEvent } from '@mui/material/Select'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import Search from '@mui/icons-material/Search'
import DataTable from '../../components/data/DataTable'
import { type TableFeatures } from '../../components/data/table'
import PageHeader from '../../components/ui/PageHeader'
import { useAuditLogs } from '../../hooks/useAudit'
import { useAuth } from '../../hooks/useAuth'
import { useShops } from '../../hooks/useShops'
import { useUserOptions } from '../../hooks/useUsers'
import { formatDateTime } from '../../lib/utils'
import { AUDIT_ACTION_LABELS, AUDIT_ACTIONS } from '../../types/audit'
import type { AuditLogRecord } from '../../types/audit'
import { useMobileNav } from '../../layouts/mobile/mobileNav'
import AuditDetailDialog from './AuditDetailDialog'

const MobileAuditLogsScreen = lazy(() => import('./MobileAuditLogsScreen'))

export default function AuditLogsPage() {
  const { profile } = useAuth()
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 })
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [shopFilter, setShopFilter] = useState('')
  const [userFilter, setUserFilter] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const isSuperAdmin = profile?.role === 'super_admin'
  const userScope = isSuperAdmin ? (shopFilter || null) : (profile?.shop_id ?? null)

  const mobileNav = useMobileNav()
  const isMobile = mobileNav.isMobile
  const [selectedAudit, setSelectedAudit] = useState<AuditLogRecord | null>(null)

  const shopsQuery = useShops()
  const shops = shopsQuery.data ?? []
  const shopName = (id: string) => shops.find((shop) => shop.id === id)?.name ?? '—'

  const userOptionsQuery = useUserOptions(userScope)
  const userOptions = userOptionsQuery.data ?? []

  const { data, isLoading } = useAuditLogs({
    page: pagination.pageIndex,
    pageSize: pagination.pageSize,
    search,
    shopId: isSuperAdmin ? shopFilter : undefined,
    userId: userFilter || undefined,
    action: actionFilter || undefined,
    dateFrom,
    dateTo,
  })

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim())
      setPagination((prev) => ({ ...prev, pageIndex: 0 }))
    }, 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  const resetPage = () => setPagination((prev) => ({ ...prev, pageIndex: 0 }))

  const columns: ColumnDef<TableFeatures, AuditLogRecord, unknown>[] = []

  if (isSuperAdmin) {
    columns.push({
      accessorKey: 'shop_id',
      header: 'Shop',
      cell: (info) => (
        <Typography variant="body2">
          {info.getValue<string>() ? shopName(info.getValue<string>()) : '—'}
        </Typography>
      ),
    })
  }

  columns.push(
    {
      accessorKey: 'created_at',
      header: 'Date',
      cell: (info) => <Typography variant="body2">{formatDateTime(info.getValue<string>())}</Typography>,
    },
    {
      accessorKey: 'user',
      header: 'User',
      cell: (info) => {
        const user = info.getValue<AuditLogRecord['user']>()
        return (
          <Stack>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {user?.full_name ?? 'System'}
            </Typography>
            {user && (
              <Typography variant="caption" color="text.secondary">
                {user.role.replace('_', ' ')}
              </Typography>
            )}
          </Stack>
        )
      },
    },
    {
      accessorKey: 'action',
      header: 'Action',
      cell: (info) => {
        const action = info.getValue<string>()
        return (
          <Stack>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {AUDIT_ACTION_LABELS[action] ?? action.replace(/_/g, ' ')}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {action}
            </Typography>
          </Stack>
        )
      },
    },
    {
      accessorKey: 'entity',
      header: 'Resource',
      cell: (info) => {
        const entity = info.getValue<string>()
        const entityId = info.row.original.entity_id
        return (
          <Stack>
            <Typography variant="body2">{entity}</Typography>
            {entityId && (
              <Typography variant="caption" color="text.secondary">
                {entityId.slice(0, 8)}
              </Typography>
            )}
          </Stack>
        )
      },
    },
    {
      accessorKey: 'reason',
      header: 'Reason',
      cell: (info) => {
        const reason = info.getValue<string | null>()
        return (
          <Typography variant="body2" color={reason ? 'text.primary' : 'text.secondary'}>
            {reason ?? '—'}
          </Typography>
        )
      },
    },
  )

  if (isMobile) {
    return (
      <Suspense fallback={<Loading />}>
        <MobileAuditLogsScreen />
      </Suspense>
    )
  }

  return (
    <Box>
      <PageHeader
        title="Audit Logs"
        subtitle="Immutable trail of sales, payments, and user management actions"
      />

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2, flexWrap: 'wrap' }}>
        <TextField
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder="Search action, resource, or user"
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
              setUserFilter('')
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
          value={userFilter}
          onChange={(event: SelectChangeEvent<string>) => {
            setUserFilter(event.target.value)
            resetPage()
          }}
          displayEmpty
          sx={{ minWidth: 180 }}
        >
          <MenuItem value="">All users</MenuItem>
          {userOptions.map((user) => (
            <MenuItem key={user.id} value={user.id}>
              {user.full_name}
            </MenuItem>
          ))}
        </Select>
        <Select
          value={actionFilter}
          onChange={(event: SelectChangeEvent<string>) => {
            setActionFilter(event.target.value)
            resetPage()
          }}
          displayEmpty
          sx={{ minWidth: 180 }}
        >
          <MenuItem value="">All actions</MenuItem>
          {AUDIT_ACTIONS.map((action) => (
            <MenuItem key={action} value={action}>
              {AUDIT_ACTION_LABELS[action]}
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

      <DataTable<AuditLogRecord>
        columns={columns}
        data={data?.rows ?? []}
        getRowId={(row) => row.id}
        loading={isLoading}
        rowCount={data?.count ?? 0}
        pagination={pagination}
        onPaginationChange={setPagination}
        emptyTitle="No audit entries found"
        emptyDescription="Actions from sales, payments, and user management will appear here."
      />

      <AuditDetailDialog
        record={selectedAudit}
        shopName={shopName(selectedAudit?.shop_id ?? '')}
        onClose={() => setSelectedAudit(null)}
      />
    </Box>
  )
}