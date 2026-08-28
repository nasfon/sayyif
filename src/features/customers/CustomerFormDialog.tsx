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
import { FormSelect, FormTextField } from '../../components/forms'
import type { CustomerRecord } from '../../types/customers'
import type { ShopOption } from '../../types/users'
import {
  createCustomerSchema,
  editCustomerSchema,
  type CreateCustomerFormValues,
  type EditCustomerFormValues,
} from './customersSchema'

interface CustomerFormDialogProps {
  open: boolean
  mode: 'create' | 'edit'
  customer?: CustomerRecord
  shopOptions: ShopOption[]
  requireShopSelect: boolean
  defaultShopId: string
  isSubmitting: boolean
  submitError: string | null
  onSubmit: (values: CreateCustomerFormValues | EditCustomerFormValues) => void
  onClose: () => void
}

export default function CustomerFormDialog({
  open,
  mode,
  customer,
  shopOptions,
  requireShopSelect,
  defaultShopId,
  isSubmitting,
  submitError,
  onSubmit,
  onClose,
}: CustomerFormDialogProps) {
  const isCreate = mode === 'create'

  const createDefaults: CreateCustomerFormValues = {
    shop_id: defaultShopId,
    full_name: '',
    phone: '',
    email: '',
    address: '',
  }
  const editDefaults: EditCustomerFormValues = {
    full_name: customer?.full_name ?? '',
    phone: customer?.phone ?? '',
    email: customer?.email ?? '',
    address: customer?.address ?? '',
  }

  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting: formSubmitting },
  } = useForm<CreateCustomerFormValues | EditCustomerFormValues>({
    resolver: zodResolver(isCreate ? createCustomerSchema : editCustomerSchema),
    defaultValues: isCreate ? createDefaults : editDefaults,
  })

  useEffect(() => {
    if (open) {
      reset(isCreate ? createDefaults : editDefaults)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode, customer, reset])

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <Box component="form" noValidate onSubmit={handleSubmit(onSubmit)}>
        <DialogTitle>{isCreate ? 'Add Customer' : 'Edit Customer'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          {submitError && <Alert severity="error">{submitError}</Alert>}
          {isCreate && requireShopSelect && (
            <FormSelect name="shop_id" control={control} label="Shop">
              <MenuItem value="">Select a shop</MenuItem>
              {shopOptions.map((shop) => (
                <MenuItem key={shop.id} value={shop.id}>
                  {shop.name}
                </MenuItem>
              ))}
            </FormSelect>
          )}
          <FormTextField name="full_name" control={control} label="Customer name" autoFocus autoComplete="off" />
          <FormTextField name="phone" control={control} label="Phone" autoComplete="off" />
          <FormTextField name="email" control={control} label="Email" type="email" autoComplete="off" />
          <FormTextField name="address" control={control} label="Address" multiline minRows={2} autoComplete="off" />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={onClose} disabled={isSubmitting || formSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={isSubmitting || formSubmitting}>
            {isCreate ? 'Create Customer' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  )
}