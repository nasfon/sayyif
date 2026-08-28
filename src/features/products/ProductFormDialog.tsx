import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import FormControlLabel from '@mui/material/FormControlLabel'
import MenuItem from '@mui/material/MenuItem'
import Switch from '@mui/material/Switch'
import { FormMoneyField, FormSelect, FormTextField } from '../../components/forms'
import type { ProductRecord } from '../../types/products'
import type { ShopOption } from '../../types/users'
import {
  createProductSchema,
  editProductSchema,
  type CreateProductFormValues,
  type EditProductFormValues,
} from './productsSchema'

type ProductFormInput = z.input<typeof createProductSchema> | z.input<typeof editProductSchema>
type ProductFormOutput = z.output<typeof createProductSchema> | z.output<typeof editProductSchema>

interface ProductFormDialogProps {
  open: boolean
  mode: 'create' | 'edit'
  product?: ProductRecord
  shopOptions: ShopOption[]
  requireShopSelect: boolean
  defaultShopId: string
  isSubmitting: boolean
  submitError: string | null
  onSubmit: (values: CreateProductFormValues | EditProductFormValues) => void
  onClose: () => void
}

export default function ProductFormDialog({
  open,
  mode,
  product,
  shopOptions,
  requireShopSelect,
  defaultShopId,
  isSubmitting,
  submitError,
  onSubmit,
  onClose,
}: ProductFormDialogProps) {
  const isCreate = mode === 'create'

  const createDefaults: ProductFormInput = {
    shop_id: defaultShopId,
    name: '',
    sku: '',
    quantity: '',
    selling_price: '',
    minimum_stock: '',
  }
  const editDefaults: ProductFormInput = {
    name: product?.name ?? '',
    sku: product?.sku ?? '',
    quantity: product?.quantity ?? '',
    selling_price: product?.selling_price ?? '',
    minimum_stock: product?.minimum_stock ?? '',
    is_active: product?.is_active ?? true,
  }

  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting: formSubmitting },
  } = useForm<ProductFormInput, unknown, ProductFormOutput>({
    resolver: zodResolver(isCreate ? createProductSchema : editProductSchema),
    defaultValues: isCreate ? createDefaults : editDefaults,
  })

  useEffect(() => {
    if (open) {
      reset(isCreate ? createDefaults : editDefaults)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode, product, reset])

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <Box component="form" noValidate onSubmit={handleSubmit(onSubmit)}>
        <DialogTitle>{isCreate ? 'Add Product' : 'Edit Product'}</DialogTitle>
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
          <FormTextField name="name" control={control} label="Product name" autoFocus autoComplete="off" />
          <FormTextField name="sku" control={control} label="SKU" autoComplete="off" />
          <FormTextField
            name="quantity"
            control={control}
            label="Quantity"
            type="number"
            slotProps={{ htmlInput: { min: 0, step: 1 } }}
            autoComplete="off"
          />
          <FormMoneyField
            name="selling_price"
            control={control}
            label="Selling price"
            autoComplete="off"
          />
          <FormTextField
            name="minimum_stock"
            control={control}
            label="Minimum stock"
            type="number"
            slotProps={{ htmlInput: { min: 0, step: 1 } }}
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
            {isCreate ? 'Create Product' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  )
}