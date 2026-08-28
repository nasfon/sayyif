import type { ReactNode } from 'react'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Close from '@mui/icons-material/Close'
import { AUDIT_ACTION_LABELS } from '../../types/audit'
import type { AuditLogRecord } from '../../types/audit'
import { formatDateTime } from '../../lib/utils'

interface AuditDetailDialogProps {
  record: AuditLogRecord | null
  shopName: string
  onClose: () => void
}

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

export default function AuditDetailDialog({ record, shopName, onClose }: AuditDetailDialogProps) {
  return (
    <Dialog open={record !== null} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pr: 1 }}>
        <Stack sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            {record ? AUDIT_ACTION_LABELS[record.action] ?? record.action.replace(/_/g, ' ') : 'Audit entry'}
          </Typography>
          {record && (
            <Typography variant="body2" color="text.secondary">
              {formatDateTime(record.created_at)}
            </Typography>
          )}
        </Stack>
        <IconButton aria-label="Close" onClick={onClose}>
          <Close />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        {record && (
          <Stack spacing={1.5}>
            <Field label="User" value={record.user?.full_name ?? 'System'} />
            <Field label="Role" value={record.user ? record.user.role.replace('_', ' ') : '—'} />
            <Field label="Resource" value={record.entity} />
            {record.entity_id && (
              <Field label="Resource ID" value={record.entity_id.slice(0, 8)} />
            )}
            <Field label="Shop" value={shopName ?? '—'} />
            <Divider />
            <Field label="Reason" value={record.reason ?? '—'} />
            {record.ip_address && <Field label="IP address" value={record.ip_address} />}
          </Stack>
        )}
        <Button onClick={onClose} variant="contained" fullWidth sx={{ mt: 2.5 }}>
          Close
        </Button>
      </DialogContent>
    </Dialog>
  )
}
