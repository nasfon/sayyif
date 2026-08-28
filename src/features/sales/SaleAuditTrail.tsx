import { useState } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import History from '@mui/icons-material/History'
import { AUDIT_ACTION_LABELS } from '../../types/audit'
import type { AuditLogRecord } from '../../types/audit'
import { useSaleAuditTrail } from '../../hooks/useAudit'
import { formatDateTime } from '../../lib/utils'
import AuditDetailDialog from '../audit/AuditDetailDialog'

interface SaleAuditTrailProps {
  saleId: string
  shopName?: string
}

function actionColor(action: string): 'success' | 'warning' | 'error' | 'default' {
  if (action === 'sale_created') return 'success'
  if (action === 'sale_corrected') return 'warning'
  if (action === 'sale_reversed') return 'error'
  return 'default'
}

export default function SaleAuditTrail({ saleId, shopName = '—' }: SaleAuditTrailProps) {
  const { data, isLoading } = useSaleAuditTrail(saleId)
  const [selected, setSelected] = useState<AuditLogRecord | null>(null)

  if (isLoading) {
    return (
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', color: 'text.secondary' }}>
        <CircularProgress size={16} />
        <Typography variant="body2">Loading history...</Typography>
      </Stack>
    )
  }

  const entries = data ?? []

  if (entries.length === 0) {
    return (
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', color: 'text.secondary' }}>
        <History fontSize="small" />
        <Typography variant="body2">No history recorded for this sale.</Typography>
      </Stack>
    )
  }

  return (
    <Stack spacing={1}>
      {entries.map((entry, index) => (
        <Box
          key={entry.id}
          onClick={() => setSelected(entry)}
          sx={{
            display: 'flex',
            gap: 1.5,
            alignItems: 'flex-start',
            cursor: 'pointer',
            borderRadius: 1.5,
            p: 1,
            '&:hover': { bgcolor: 'action.hover' },
          }}
        >
          <Box
            sx={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              mt: 0.75,
              bgcolor: (theme) =>
                actionColor(entry.action) === 'success'
                  ? theme.palette.success.main
                  : actionColor(entry.action) === 'warning'
                    ? theme.palette.warning.main
                    : actionColor(entry.action) === 'error'
                      ? theme.palette.error.main
                      : theme.palette.grey[400],
            }}
          />
          <Stack sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" sx={{ justifyContent: 'space-between', gap: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {AUDIT_ACTION_LABELS[entry.action] ?? entry.action.replace(/_/g, ' ')}
              </Typography>
              <Typography variant="caption" color="text.secondary" noWrap>
                {formatDateTime(entry.created_at)}
              </Typography>
            </Stack>
            <Typography variant="caption" color="text.secondary">
              {entry.user?.full_name ?? 'System'}
              {entry.user ? ` · ${entry.user.role.replace('_', ' ')}` : ''}
            </Typography>
            {entry.reason && (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  mt: 0.5,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {entry.reason}
              </Typography>
            )}
            {index === entries.length - 1 && (
              <Button
                size="small"
                sx={{ alignSelf: 'flex-start', mt: 0.5, px: 0 }}
                onClick={(event) => {
                  event.stopPropagation()
                  setSelected(entry)
                }}
              >
                View details
              </Button>
            )}
          </Stack>
        </Box>
      ))}

      <AuditDetailDialog record={selected} shopName={shopName} onClose={() => setSelected(null)} />
    </Stack>
  )
}
