import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'
import Typography from '@mui/material/Typography'
import { FormTextField } from '../../components/forms'
import { formatCurrency } from '../../lib/utils'
import type { SaleDetail } from '../../types/sales'
import { reasonSchema, type ReasonFormInput, type ReasonFormValues } from './salesSchema'

interface ReverseSaleDialogProps {
  open: boolean
  sale: SaleDetail
  isSubmitting: boolean
  submitError: string | null
  onSubmit: (values: ReasonFormValues) => void
  onClose: () => void
}

export default function ReverseSaleDialog({
  open,
  sale,
  isSubmitting,
  submitError,
  onSubmit,
  onClose,
}: ReverseSaleDialogProps) {
  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting: formSubmitting },
  } = useForm<ReasonFormInput, unknown, ReasonFormValues>({
    resolver: zodResolver(reasonSchema),
    defaultValues: { reason: '' },
  })

  useEffect(() => {
    if (open) {
      reset({ reason: '' })
    }
  }, [open, reset])

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <Box component="form" noValidate onSubmit={handleSubmit(onSubmit)}>
        <DialogTitle>Reverse sale</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <DialogContentText>
            Reversing {sale.receipt_number} restores all items to stock and voids the sale. This action is
            recorded in the audit trail and cannot be undone.
          </DialogContentText>
          <Typography variant="body2" color="text.secondary">
            Sale total: {formatCurrency(sale.total)}
            {sale.amount_paid > 0 && ` · Amount paid: ${formatCurrency(sale.amount_paid)} (refund owed)`}
          </Typography>
          {submitError && <Alert severity="error">{submitError}</Alert>}
          <FormTextField
            name="reason"
            control={control}
            label="Reason for reversal"
            placeholder="Explain why this sale is being reversed"
            multiline
            minRows={2}
            autoFocus
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={onClose} disabled={isSubmitting || formSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            color="error"
            disabled={isSubmitting || formSubmitting}
          >
            Reverse Sale
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  )
}
