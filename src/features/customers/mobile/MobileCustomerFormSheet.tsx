import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import { BottomSheet } from '../../../components/mobile'
import { FormSelect, FormTextField } from '../../../components/forms'
import type { CustomerRecord } from '../../../types/customers'
import type { ShopOption } from '../../../types/users'
import {
  createCustomerSchema,
  editCustomerSchema,
  type CreateCustomerFormValues,
  type EditCustomerFormValues,
} from '../customersSchema'

type CustomerFormInput = CreateCustomerFormValues | EditCustomerFormValues

interface MobileCustomerFormSheetProps {
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

export default function MobileCustomerFormSheet({
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
}: MobileCustomerFormSheetProps) {
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
  } = useForm<CustomerFormInput>({
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
    <BottomSheet open={open} onClose={onClose} title={isCreate ? 'Add Customer' : 'Edit Customer'}>
      <Box component="form" noValidate onSubmit={handleSubmit(onSubmit)}>
        {submitError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {submitError}
          </Alert>
        )}
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
        <Stack direction="row" spacing={1.5} sx={{ mt: 2.5 }}>
          <Button onClick={onClose} disabled={isSubmitting || formSubmitting} fullWidth>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={isSubmitting || formSubmitting} fullWidth>
            {isCreate ? 'Create' : 'Save'}
          </Button>
        </Stack>
      </Box>
    </BottomSheet>
  )
}
