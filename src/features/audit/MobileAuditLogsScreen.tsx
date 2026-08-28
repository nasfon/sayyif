import { useEffect, useMemo, useState, type ReactNode } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import MenuItem from '@mui/material/MenuItem'
import Paper from '@mui/material/Paper'
import Select, { type SelectChangeEvent } from '@mui/material/Select'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { BottomSheet, MobileRow, SearchBar } from '../../components/mobile'
import { useAuth } from '../../hooks/useAuth'
import { usePermissions } from '../../hooks/usePermissions'
import { useInfiniteScroll } from '../../hooks/useInfiniteScroll'
import { useMobileNav } from '../../layouts/mobile/mobileNav'
import { useInfiniteAuditLogs } from '../../hooks/useAudit'
import { useShops } from '../../hooks/useShops'
import { useUserOptions } from '../../hooks/useUsers'
import { formatDate, formatDateTime } from '../../lib/utils'
import { AUDIT_ACTION_LABELS, AUDIT_ACTIONS, type AuditLogRecord } from '../../types/audit'

function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <Stack direction="row" sx={{ justifyContent: 'space-between', gap: 2 }}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 600, textAlign: 'right' }}>
        {value}
      </Typography>
    </Stack>
  )
}

export default function MobileAuditLogsScreen() {
  const { profile } = useAuth()
  const permissions = usePermissions()
  const mobileNav = useMobileNav()
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [shopFilter, setShopFilter] = useState('')
  const [userFilter, setUserFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [selected, setSelected] = useState<AuditLogRecord | null>(null)

  const canView = permissions.canViewAuditLogs
  const isSuperAdmin = permissions.isSuperAdmin
  const userScope = isSuperAdmin ? (shopFilter || null) : (profile?.shop_id ?? null)

  const shopsQuery = useShops()
  const shops = shopsQuery.data ?? []
  const shopName = (id: string) => shops.find((shop) => shop.id === id)?.name ?? '—'

  const userOptionsQuery = useUserOptions(userScope)
  const userOptions = userOptionsQuery.data ?? []

  const query = useInfiniteAuditLogs({
    search,
    shopId: isSuperAdmin ? shopFilter : undefined,
    userId: userFilter || undefined,
    action: actionFilter || undefined,
    dateFrom,
    dateTo,
  })
  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage, refetch } = query
  const rows = useMemo(() => (data?.pages ?? []).flatMap((page) => page.rows), [data])

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  useEffect(() => {
    mobileNav.setRefresh(() => refetch())
    return () => mobileNav.setRefresh(null)
  }, [mobileNav, refetch])

  const sentinelRef = useInfiniteScroll(
    () => {
      if (hasNextPage && !isFetchingNextPage) fetchNextPage()
    },
    hasNextPage && !isFetchingNextPage,
  )

  if (!canView) {
    return (
      <Box>
        <Alert severity="error">You do not have permission to view audit logs.</Alert>
      </Box>
    )
  }

  return (
    <Box>
      <Box sx={{ mb: 1.5 }}>
        <SearchBar value={searchInput} onChange={setSearchInput} placeholder="Search action, resource, user" />
      </Box>

      <Stack spacing={1.5} sx={{ mb: 1.5 }}>
        <Select
          value={actionFilter}
          onChange={(event: SelectChangeEvent<string>) => setActionFilter(event.target.value)}
          displayEmpty
          size="small"
          fullWidth
        >
          <MenuItem value="">All actions</MenuItem>
          {AUDIT_ACTIONS.map((action) => (
            <MenuItem key={action} value={action}>
              {AUDIT_ACTION_LABELS[action]}
            </MenuItem>
          ))}
        </Select>

        {isSuperAdmin && (
          <Select
            value={shopFilter}
            onChange={(event: SelectChangeEvent<string>) => {
              setShopFilter(event.target.value)
              setUserFilter('')
            }}
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
        )}

        <Select
          value={userFilter}
          onChange={(event: SelectChangeEvent<string>) => setUserFilter(event.target.value)}
          displayEmpty
          size="small"
          fullWidth
        >
          <MenuItem value="">All users</MenuItem>
          {userOptions.map((user) => (
            <MenuItem key={user.id} value={user.id}>
              {user.full_name}
            </MenuItem>
          ))}
        </Select>

        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <TextField
            label="From"
            type="date"
            size="small"
            value={dateFrom}
            onChange={(event) => setDateFrom(event.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
            sx={{ flex: 1, minWidth: 0 }}
          />
          <TextField
            label="To"
            type="date"
            size="small"
            value={dateTo}
            onChange={(event) => setDateTo(event.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
            sx={{ flex: 1, minWidth: 0 }}
          />
        </Stack>
      </Stack>

      {isLoading ? (
        <Stack spacing={1.5}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Paper key={i} variant="outlined" sx={{ px: 2, py: 1.5 }}>
              <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                <Box sx={{ flex: 1 }}>
                  <Box sx={{ width: '60%', height: 18, bgcolor: 'action.hover', borderRadius: 1 }} />
                  <Box sx={{ width: '40%', height: 14, bgcolor: 'action.hover', borderRadius: 1, mt: 0.5 }} />
                </Box>
                <Box sx={{ width: 56, height: 20, bgcolor: 'action.hover', borderRadius: 1 }} />
              </Stack>
            </Paper>
          ))}
        </Stack>
      ) : rows.length === 0 ? (
        <Box sx={{ py: 8, textAlign: 'center' }}>
          <Typography variant="h6">No audit entries found</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Actions from sales, payments, and user management will appear here.
          </Typography>
        </Box>
      ) : (
        <Box>
          {rows.map((row) => (
            <MobileRow
              key={row.id}
              primary={AUDIT_ACTION_LABELS[row.action] ?? row.action.replace(/_/g, ' ')}
              secondary={
                row.user
                  ? `${row.user.full_name} · ${row.user.role.replace('_', ' ')}`
                  : 'System'
              }
              trailing={
                <Stack>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {formatDate(row.created_at)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {row.entity}
                  </Typography>
                </Stack>
              }
              onClick={() => setSelected(row)}
            />
          ))}
          <Box ref={sentinelRef} sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
            {isFetchingNextPage ? <CircularProgress size={24} /> : null}
          </Box>
        </Box>
      )}

      <BottomSheet
        open={selected !== null}
        onClose={() => setSelected(null)}
        title={selected ? AUDIT_ACTION_LABELS[selected.action] ?? selected.action.replace(/_/g, ' ') : 'Audit entry'}
      >
        {selected && (
          <Stack spacing={1.5}>
            <Field label="Date" value={formatDateTime(selected.created_at)} />
            <Field label="User" value={selected.user?.full_name ?? 'System'} />
            {selected.user && (
              <Field label="Role" value={selected.user.role.replace('_', ' ')} />
            )}
            <Field label="Resource" value={selected.entity} />
            {selected.entity_id && (
              <Field label="Resource ID" value={selected.entity_id.slice(0, 8)} />
            )}
            <Field label="Shop" value={shopName(selected.shop_id ?? '')} />
            <Divider />
            <Field label="Reason" value={selected.reason ?? '—'} />
            {selected.ip_address && <Field label="IP address" value={selected.ip_address} />}
          </Stack>
        )}
      </BottomSheet>
    </Box>
  )
}
