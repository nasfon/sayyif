import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import MenuItem from '@mui/material/MenuItem'
import Typography from '@mui/material/Typography'
import { FormMoneyField, FormSelect } from '../../components/forms'
import { formatCurrency } from '../../lib/utils'
import { CREDIT_PAYMENT_METHOD_LABELS } from '../../types/credit'
import {
  CREDIT_PAYMENT_METHOD_OPTIONS,
  recordPaymentSchema,
  type RecordPaymentFormInput,
  type RecordPaymentFormValues,
} from './creditSchema'

interface RecordPaymentDialogProps {
  open: boolean
  customerName: string
  outstanding: number
  isSubmitting: boolean
  submitError: string | null
  onSubmit: (values: RecordPaymentFormValues) => void
  onClose: () => void
}

export default function RecordPaymentDialog({
  open,
  customerName,
  outstanding,
  isSubmitting,
  submitError,
  onSubmit,
  onClose,
}: RecordPaymentDialogProps) {
  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting: formSubmitting },
  } = useForm<RecordPaymentFormInput, unknown, RecordPaymentFormValues>({
    resolver: zodResolver(recordPaymentSchema(outstanding)),
    defaultValues: { amount: outstanding, payment_method: 'cash' },
  })

  useEffect(() => {
    if (open) {
      reset({ amount: outstanding, payment_method: 'cash' })
    }
  }, [open, outstanding, reset])

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <Box component="form" noValidate onSubmit={handleSubmit(onSubmit)}>
        <DialogTitle>Record Payment</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Recording a payment toward {customerName}&apos;s outstanding balance of {formatCurrency(outstanding)}.
          </Typography>
          {submitError && <Alert severity="error">{submitError}</Alert>}
          <FormMoneyField
            name="amount"
            control={control}
            label="Amount"
            autoFocus
          />
          <FormSelect name="payment_method" control={control} label="Payment method">
            {CREDIT_PAYMENT_METHOD_OPTIONS.map((method) => (
              <MenuItem key={method} value={method}>
                {CREDIT_PAYMENT_METHOD_LABELS[method]}
              </MenuItem>
            ))}
          </FormSelect>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={onClose} disabled={isSubmitting || formSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={isSubmitting || formSubmitting}>
            Record Payment
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  )
}