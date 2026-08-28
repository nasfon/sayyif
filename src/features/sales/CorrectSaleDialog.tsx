import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import Add from '@mui/icons-material/Add'
import DeleteOutlined from '@mui/icons-material/DeleteOutlined'
import Remove from '@mui/icons-material/Remove'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { FormTextField } from '../../components/forms'
import { formatCurrency, roundToTwo } from '../../lib/utils'
import * as productsService from '../../services/products'
import type { ProductRecord } from '../../types/products'
import type { SaleDetail } from '../../types/sales'
import ProductPicker from './ProductPicker'
import { reasonSchema, type ReasonFormInput, type ReasonFormValues } from './salesSchema'

interface CorrectionLine {
  product_id: string
  name: string
  unit_price: number
  quantity: number
  available: number
}

interface CorrectSaleDialogProps {
  open: boolean
  sale: SaleDetail
  isSubmitting: boolean
  submitError: string | null
  onSubmit: (values: { items: { product_id: string; quantity: number }[]; reason: string }) => void
  onClose: () => void
}

export default function CorrectSaleDialog({
  open,
  sale,
  isSubmitting,
  submitError,
  onSubmit,
  onClose,
}: CorrectSaleDialogProps) {
  const productIds = sale.items.map((item) => item.product_id).filter(Boolean) as string[]

  const stockQuery = useQuery({
    queryKey: ['products', 'quantities', sale.id],
    queryFn: () => productsService.getProductQuantities(productIds),
    enabled: open,
  })

  const [overrides, setOverrides] = useState<Record<string, number>>({})
  const [removed, setRemoved] = useState<string[]>([])
  const [added, setAdded] = useState<ProductRecord[]>([])
  const [addedQty, setAddedQty] = useState<Record<string, number>>({})
  const [itemError, setItemError] = useState<string | null>(null)

  const {
    control,
    handleSubmit,
    formState: { isSubmitting: formSubmitting },
  } = useForm<ReasonFormInput, unknown, ReasonFormValues>({
    resolver: zodResolver(reasonSchema),
    defaultValues: { reason: '' },
  })

  const stock = stockQuery.data ?? {}

  const cart: CorrectionLine[] = sale.items
    .filter((item) => item.product_id && !removed.includes(item.product_id))
    .map((item) => {
      const id = item.product_id as string
      const current = stock[id] ?? 0
      const baseQty = overrides[id] ?? item.quantity
      return {
        product_id: id,
        name: item.product_name,
        unit_price: item.unit_price,
        quantity: baseQty,
        available: item.quantity + current,
      }
    })
    .concat(
      added.map((product) => ({
        product_id: product.id,
        name: product.name,
        unit_price: product.selling_price,
        quantity: addedQty[product.id] ?? 1,
        available: stock[product.id] ?? product.quantity,
      })),
    )

  const subtotal = roundToTwo(
    cart.reduce((sum, line) => sum + roundToTwo(line.unit_price * line.quantity), 0),
  )

  const handleAddProduct = (product: ProductRecord) => {
    setItemError(null)
    setAddedQty((prev) => ({ ...prev, [product.id]: 1 }))
    setAdded((prev) => (prev.some((p) => p.id === product.id) ? prev : [...prev, product]))
  }

  const handleChangeQuantity = (productId: string, quantity: number) => {
    if (!Number.isInteger(quantity) || quantity < 1) return
    setItemError(null)
    const line = cart.find((l) => l.product_id === productId)
    if (!line) return
    const next = Math.min(quantity, line.available)
    if (added.some((p) => p.id === productId)) {
      setAddedQty((prev) => ({ ...prev, [productId]: next }))
    } else {
      setOverrides((prev) => ({ ...prev, [productId]: next }))
    }
  }

  const handleRemove = (productId: string) => {
    setItemError(null)
    if (added.some((p) => p.id === productId)) {
      setAdded((prev) => prev.filter((p) => p.id !== productId))
      setAddedQty((prev) => {
        const next = { ...prev }
        delete next[productId]
        return next
      })
    } else {
      setRemoved((prev) => (prev.includes(productId) ? prev : [...prev, productId]))
    }
  }

  const submit = (values: ReasonFormValues) => {
    setItemError(null)
    const invalid = cart.find((line) => line.quantity < 1 || line.quantity > line.available)
    if (cart.length === 0) {
      setItemError('Add at least one product to the corrected sale.')
      return
    }
    if (invalid) {
      setItemError('One or more items exceed available stock or have an invalid quantity.')
      return
    }
    onSubmit({
      items: cart.map((line) => ({ product_id: line.product_id, quantity: line.quantity })),
      reason: values.reason,
    })
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <Box component="form" noValidate onSubmit={handleSubmit(submit)}>
        <DialogTitle>Correct sale</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <DialogContentText>
            Adjust the items for {sale.receipt_number}. Stock is restored and re-deducted automatically, and
            the change is recorded in the audit trail.
          </DialogContentText>

          {stockQuery.isLoading ? (
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', color: 'text.secondary' }}>
              <CircularProgress size={16} />
              <Typography variant="body2">Loading current stock...</Typography>
            </Stack>
          ) : stockQuery.isError ? (
            <Alert severity="error">Could not load current stock levels.</Alert>
          ) : (
            <ProductPicker
              shopId={sale.shop_id}
              addedIds={cart.map((line) => line.product_id)}
              onAdd={handleAddProduct}
            />
          )}

          {cart.length === 0 ? (
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                No items selected. Add products above to build the corrected sale.
              </Typography>
            </Paper>
          ) : (
            <Paper sx={{ overflow: 'hidden' }}>
              <Stack divider={<Divider />}>
                {cart.map((line) => (
                  <Stack
                    key={line.product_id}
                    direction="row"
                    spacing={1.5}
                    sx={{ alignItems: 'center', px: 2.5, py: 1.5 }}
                  >
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography noWrap variant="body2" sx={{ fontWeight: 600 }}>
                        {line.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatCurrency(line.unit_price)} · {line.available} available
                      </Typography>
                    </Box>
                    <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                      <IconButton
                        size="small"
                        aria-label="Decrease quantity"
                        onClick={() => handleChangeQuantity(line.product_id, line.quantity - 1)}
                        disabled={line.quantity <= 1}
                      >
                        <Remove fontSize="small" />
                      </IconButton>
                      <Typography
                        variant="body2"
                        sx={{ minWidth: 28, textAlign: 'center', fontWeight: 600 }}
                      >
                        {line.quantity}
                      </Typography>
                      <IconButton
                        size="small"
                        aria-label="Increase quantity"
                        onClick={() => handleChangeQuantity(line.product_id, line.quantity + 1)}
                        disabled={line.quantity >= line.available}
                      >
                        <Add fontSize="small" />
                      </IconButton>
                    </Stack>
                    <Typography
                      variant="body2"
                      sx={{ minWidth: 90, textAlign: 'right', fontWeight: 700 }}
                    >
                      {formatCurrency(line.unit_price * line.quantity)}
                    </Typography>
                    <IconButton
                      size="small"
                      aria-label="Remove item"
                      onClick={() => handleRemove(line.product_id)}
                      sx={{ color: 'text.secondary', ml: 0.5 }}
                    >
                      <DeleteOutlined fontSize="small" />
                    </IconButton>
                  </Stack>
                ))}
              </Stack>
              <Divider />
              <Stack direction="row" sx={{ justifyContent: 'space-between', px: 2, py: 1.5 }}>
                <Typography variant="body2" color="text.secondary">
                  New subtotal
                </Typography>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  {formatCurrency(subtotal)}
                </Typography>
              </Stack>
            </Paper>
          )}

          {itemError && <Alert severity="error">{itemError}</Alert>}
          {submitError && <Alert severity="error">{submitError}</Alert>}

          <FormTextField
            name="reason"
            control={control}
            label="Reason for correction"
            placeholder="Explain what was corrected and why"
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
            color="warning"
            disabled={isSubmitting || formSubmitting || stockQuery.isLoading}
          >
            Save Correction
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  )
}
