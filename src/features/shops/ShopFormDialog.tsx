import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import FormControlLabel from '@mui/material/FormControlLabel'
import Switch from '@mui/material/Switch'
import { FormTextField } from '../../components/forms'
import type { ShopRecord } from '../../types/shops'
import {
  createShopSchema,
  editShopSchema,
  type CreateShopFormValues,
  type EditShopFormValues,
} from './shopsSchema'

interface ShopFormDialogProps {
  open: boolean
  mode: 'create' | 'edit'
  shop?: ShopRecord
  isSubmitting: boolean
  submitError: string | null
  onSubmit: (values: CreateShopFormValues | EditShopFormValues) => void
  onClose: () => void
}

export default function ShopFormDialog({
  open,
  mode,
  shop,
  isSubmitting,
  submitError,
  onSubmit,
  onClose,
}: ShopFormDialogProps) {
  const isCreate = mode === 'create'

  const createDefaults: CreateShopFormValues = {
    name: '',
    phone: '',
    email: '',
    address: '',
    logo_url: '',
    receipt_footer: '',
  }
  const editDefaults: EditShopFormValues = {
    name: shop?.name ?? '',
    phone: shop?.phone ?? '',
    email: shop?.email ?? '',
    address: shop?.address ?? '',
    logo_url: shop?.logo_url ?? '',
    receipt_footer: shop?.receipt_footer ?? '',
    is_active: shop?.is_active ?? true,
  }

  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting: formSubmitting },
  } = useForm<CreateShopFormValues | EditShopFormValues>({
    resolver: zodResolver(isCreate ? createShopSchema : editShopSchema),
    defaultValues: isCreate ? createDefaults : editDefaults,
  })

  useEffect(() => {
    if (open) {
      reset(isCreate ? createDefaults : editDefaults)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode, shop, reset])

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <Box component="form" noValidate onSubmit={handleSubmit(onSubmit)}>
        <DialogTitle>{isCreate ? 'Add Shop' : 'Edit Shop'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          {submitError && <Alert severity="error">{submitError}</Alert>}
          <FormTextField name="name" control={control} label="Shop name" autoFocus autoComplete="off" />
          <FormTextField name="phone" control={control} label="Phone" autoComplete="off" />
          <FormTextField name="email" control={control} label="Email" type="email" autoComplete="off" />
          <FormTextField name="address" control={control} label="Address" multiline minRows={2} autoComplete="off" />
          <FormTextField name="logo_url" control={control} label="Logo URL" autoComplete="off" />
          <FormTextField
            name="receipt_footer"
            control={control}
            label="Receipt footer"
            multiline
            minRows={2}
            autoComplete="off"
          />
          {!isCreate && (
            <Controller
              name="is_active"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={<Switch checked={field.value} onChange={field.onChange} />}
                  label="Active"
                />
              )}
            />
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={onClose} disabled={isSubmitting || formSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={isSubmitting || formSubmitting}>
            {isCreate ? 'Create Shop' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  )
}