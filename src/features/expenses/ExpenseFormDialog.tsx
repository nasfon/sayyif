import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import MenuItem from '@mui/material/MenuItem'
import { FormMoneyField, FormSelect, FormTextField } from '../../components/forms'
import type { ShopOption } from '../../types/users'
import {
  createExpenseSchema,
  type CreateExpenseFormValues,
} from './expensesSchema'

type ExpenseFormInput = z.input<typeof createExpenseSchema>
type ExpenseFormOutput = z.output<typeof createExpenseSchema>

interface ExpenseFormDialogProps {
  open: boolean
  shopOptions: ShopOption[]
  requireShopSelect: boolean
  defaultShopId: string
  isSubmitting: boolean
  submitError: string | null
  onSubmit: (values: CreateExpenseFormValues) => void
  onClose: () => void
}

export default function ExpenseFormDialog({
  open,
  shopOptions,
  requireShopSelect,
  defaultShopId,
  isSubmitting,
  submitError,
  onSubmit,
  onClose,
}: ExpenseFormDialogProps) {
  const defaults: ExpenseFormInput = {
    shop_id: defaultShopId,
    description: '',
    amount: '',
    expense_date: new Date().toISOString().slice(0, 10),
  }

  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting: formSubmitting },
  } = useForm<ExpenseFormInput, unknown, ExpenseFormOutput>({
    resolver: zodResolver(createExpenseSchema),
    defaultValues: defaults,
  })

  useEffect(() => {
    if (open) {
      reset(defaults)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, reset])

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <Box component="form" noValidate onSubmit={handleSubmit(onSubmit)}>
        <DialogTitle>Record Expense</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          {submitError && <Alert severity="error">{submitError}</Alert>}
          {requireShopSelect && (
            <FormSelect name="shop_id" control={control} label="Shop">
              <MenuItem value="">Select a shop</MenuItem>
              {shopOptions.map((shop) => (
                <MenuItem key={shop.id} value={shop.id}>
                  {shop.name}
                </MenuItem>
              ))}
            </FormSelect>
          )}
          <FormTextField name="description" control={control} label="Description" autoFocus autoComplete="off" />
          <FormMoneyField
            name="amount"
            control={control}
            label="Amount"
            autoComplete="off"
          />
          <FormTextField
            name="expense_date"
            control={control}
            label="Expense date"
            type="date"
            slotProps={{ htmlInput: { max: new Date().toISOString().slice(0, 10) } }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={onClose} disabled={isSubmitting || formSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={isSubmitting || formSubmitting}>
            Save Expense
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  )
}