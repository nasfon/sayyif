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
import { FormMoneyField, FormTextField } from '../../components/forms'
import { manualCreditSchema, type ManualCreditFormInput, type ManualCreditFormValues } from './creditSchema'

interface ManualCreditDialogProps {
  open: boolean
  customerName: string
  isSubmitting: boolean
  submitError: string | null
  onSubmit: (values: ManualCreditFormValues) => void
  onClose: () => void
}

export default function ManualCreditDialog({
  open,
  customerName,
  isSubmitting,
  submitError,
  onSubmit,
  onClose,
}: ManualCreditDialogProps) {
  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting: formSubmitting },
  } = useForm<ManualCreditFormInput, unknown, ManualCreditFormValues>({
    resolver: zodResolver(manualCreditSchema),
    defaultValues: { amount: 0, reason: '' },
  })

  useEffect(() => {
    if (open) {
      reset({ amount: 0, reason: '' })
    }
  }, [open, reset])

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <Box component="form" noValidate onSubmit={handleSubmit(onSubmit)}>
        <DialogTitle>Record Manual Credit</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <Alert severity="info">
            This adds {customerName} to the credit book as an amount owed, outside of any sale.
          </Alert>
          {submitError && <Alert severity="error">{submitError}</Alert>}
          <FormMoneyField name="amount" control={control} label="Amount" autoFocus />
          <FormTextField
            name="reason"
            control={control}
            label="Reason (optional)"
            multiline
            minRows={2}
            placeholder="e.g. Adjustment, service charge, off-system sale"
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={onClose} disabled={isSubmitting || formSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={isSubmitting || formSubmitting}>
            Record Credit
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  )
}
