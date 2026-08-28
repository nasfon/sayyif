import { useState } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import MenuItem from '@mui/material/MenuItem'
import Paper from '@mui/material/Paper'
import Select, { type SelectChangeEvent } from '@mui/material/Select'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import ShoppingCartCheckout from '@mui/icons-material/ShoppingCartCheckout'
import PageHeader from '../../components/ui/PageHeader'
import EmptyState from '../../components/ui/EmptyState'
import { getApiErrorMessage } from '../../lib/errors'
import { formatCurrency, roundToTwo, sanitizeMoneyInput } from '../../lib/utils'
import { useAuth } from '../../hooks/useAuth'
import { useShops } from '../../hooks/useShops'
import { useCreateSale } from '../../hooks/useSales'
import * as salesService from '../../services/sales'
import type { CustomerRecord } from '../../types/customers'
import type { ProductRecord } from '../../types/products'
import { PAYMENT_METHOD_LABELS, type PaymentMethod, type SaleDetail } from '../../types/sales'
import CustomerPicker from './CustomerPicker'
import ProductPicker from './ProductPicker'
import SaleCart, { type CartLine } from './SaleCart'
import SaleSuccessDialog from './SaleSuccessDialog'

export default function NewSalePage() {
  const { profile } = useAuth()
  const [shopSelection, setShopSelection] = useState('')
  const [cart, setCart] = useState<CartLine[]>([])
  const [customer, setCustomer] = useState<CustomerRecord | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash')
  const [amountPaidInput, setAmountPaidInput] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [successSale, setSuccessSale] = useState<SaleDetail | null>(null)
  const [partialWarning, setPartialWarning] = useState(false)

  const isSuperAdmin = profile?.role === 'super_admin'
  const shopId = isSuperAdmin ? shopSelection : (profile?.shop_id ?? '')
  const shopsQuery = useShops()
  const shops = shopsQuery.data ?? []
  const createSale = useCreateSale()

  const subtotal = roundToTwo(cart.reduce((sum, line) => sum + roundToTwo(line.unit_price * line.quantity), 0))
  const total = subtotal
  const amountPaid = amountPaidInput ?? String(total)
  const amountPaidNum = Number(amountPaid)
  const overpayment = Number.isFinite(amountPaidNum) && amountPaidNum > total
  const isWalkIn = !customer
  const remaining = roundToTwo(total - amountPaidNum)
  const hasRemainingCredit = remaining > 0.005
  const amountValid = Number.isFinite(amountPaidNum) && amountPaidNum >= 0 && !overpayment
  const canComplete =
    Boolean(shopId) && cart.length > 0 && amountValid && !createSale.isPending

  const handleAddProduct = (product: ProductRecord) => {
    setCart((prev) => {
      const existing = prev.find((line) => line.product_id === product.id)
      if (existing) {
        return prev.map((line) =>
          line.product_id === product.id
            ? { ...line, quantity: Math.min(line.quantity + 1, line.available) }
            : line,
        )
      }
      return [
        ...prev,
        {
          product_id: product.id,
          name: product.name,
          sku: product.sku,
          unit_price: product.selling_price,
          quantity: 1,
          available: product.quantity,
        },
      ]
    })
  }

  const handleChangeQuantity = (productId: string, quantity: number) => {
    if (!Number.isInteger(quantity) || quantity < 1) return
    setCart((prev) =>
      prev.map((line) =>
        line.product_id === productId ? { ...line, quantity: Math.min(quantity, line.available) } : line,
      ),
    )
  }

  const handleRemove = (productId: string) => {
    const next = cart.filter((line) => line.product_id !== productId)
    setCart(next)
    if (next.length === 0) {
      setAmountPaidInput(null)
    }
  }

  const createSaleNow = async () => {
    setSubmitError(null)
    try {
      const saleId = await createSale.mutateAsync({
        shop_id: shopId,
        customer_id: customer?.id ?? null,
        items: cart.map((line) => ({ product_id: line.product_id, quantity: line.quantity })),
        amount_paid: amountPaidNum,
        payment_method: paymentMethod,
      })
      const sale = await salesService.getSale(saleId)
      setSuccessSale(sale)
      setCart([])
      setCustomer(null)
      setPaymentMethod('cash')
      setAmountPaidInput(null)
    } catch (error) {
      setSubmitError(getApiErrorMessage(error))
    }
  }

  const handleComplete = () => {
    if (isWalkIn && hasRemainingCredit) {
      setPartialWarning(true)
      return
    }
    void createSaleNow()
  }

  const handleCancel = () => {
    setCart([])
    setCustomer(null)
    setPaymentMethod('cash')
    setAmountPaidInput(null)
    setSubmitError(null)
  }

  return (
    <Box>
      <PageHeader
        title="New Sale"
        subtitle="Process a sale with multiple products and payment methods"
      />

      {isSuperAdmin && (
        <Select
          value={shopSelection}
          onChange={(event: SelectChangeEvent<string>) => setShopSelection(event.target.value)}
          displayEmpty
          sx={{ minWidth: 220, mb: 2 }}
        >
          <MenuItem value="">Select a shop</MenuItem>
          {shops.map((shop) => (
            <MenuItem key={shop.id} value={shop.id}>
              {shop.name}
            </MenuItem>
          ))}
        </Select>
      )}

      {!shopId ? (
        <Paper sx={{ p: 3 }}>
          <EmptyState
            title="Select a shop to start a sale"
            description="Super admin sales are processed against a chosen shop."
          />
        </Paper>
      ) : (
        <Stack
          direction={{ xs: 'column', lg: 'row' }}
          spacing={3}
          sx={{ alignItems: 'stretch', width: '100%' }}
        >
          <Stack spacing={3} sx={{ flex: '1 1 0%', minWidth: 0 }}>
            <CustomerPicker shopId={shopId} value={customer} onChange={setCustomer} />
            <ProductPicker shopId={shopId} addedIds={cart.map((line) => line.product_id)} onAdd={handleAddProduct} />
            <SaleCart items={cart} onChangeQuantity={handleChangeQuantity} onRemove={handleRemove} />
          </Stack>

          <Paper sx={{ p: 2.5, width: { xs: '100%', lg: 280 } }}>
            <Stack spacing={2}>
              <Typography variant="h6">Summary</Typography>
              <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">
                  Subtotal
                </Typography>
                <Typography variant="body2">{formatCurrency(subtotal)}</Typography>
              </Stack>
              <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
                <Typography variant="body1">Total</Typography>
                <Typography variant="body1" sx={{ fontWeight: 700 }}>
                  {formatCurrency(total)}
                </Typography>
              </Stack>
              <Divider />
              <Stack spacing={1}>
                <Typography variant="subtitle2">Payment method</Typography>
                <Select
                  value={paymentMethod}
                  onChange={(event: SelectChangeEvent<PaymentMethod>) =>
                    setPaymentMethod(event.target.value as PaymentMethod)
                  }
                  size="small"
                  fullWidth
                >
                  {(Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[]).map((method) => (
                    <MenuItem key={method} value={method}>
                      {PAYMENT_METHOD_LABELS[method]}
                    </MenuItem>
                  ))}
                </Select>
              </Stack>
              <TextField
                label="Amount paid"
                type="number"
                inputMode="decimal"
                slotProps={{ htmlInput: { step: 'any', min: 0, inputMode: 'decimal' } }}
                value={amountPaidInput === null ? String(total) : amountPaidInput}
                onChange={(event) => setAmountPaidInput(sanitizeMoneyInput(event.target.value))}
                size="small"
                fullWidth
              />
              {overpayment ? (
                <Typography variant="body2" color="error.main">
                  Amount paid cannot exceed the sale total.
                </Typography>
              ) : amountPaidNum < total ? (
                <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">
                    Remaining balance
                  </Typography>
                  <Typography variant="body2" color="error.main">
                    {formatCurrency(roundToTwo(total - amountPaidNum))}
                  </Typography>
                </Stack>
              ) : (
                <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">
                    Change
                  </Typography>
                  <Typography variant="body2" color="success.main">
                    {formatCurrency(roundToTwo(amountPaidNum - total))}
                  </Typography>
                </Stack>
              )}
              {submitError && <Alert severity="error">{submitError}</Alert>}
              <Button
                variant="contained"
                size="large"
                startIcon={<ShoppingCartCheckout />}
                disabled={!canComplete}
                onClick={handleComplete}
              >
                Complete Sale
              </Button>
              <Button variant="outlined" onClick={handleCancel} disabled={createSale.isPending}>
                Cancel
              </Button>
              {!canComplete && cart.length === 0 && !submitError && (
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
                  Add at least one product to continue.
                </Typography>
              )}
            </Stack>
          </Paper>
        </Stack>
      )}

      <SaleSuccessDialog
        open={successSale !== null}
        sale={successSale}
        onClose={() => setSuccessSale(null)}
      />

      <Dialog open={partialWarning} onClose={() => setPartialWarning(false)}>
        <DialogTitle>Partial payment for walk-in</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Walk-in buyers cannot be given credit. {formatCurrency(remaining)} remains unpaid. Create the sale
            anyway?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPartialWarning(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={createSale.isPending}
            onClick={() => {
              setPartialWarning(false)
              void createSaleNow()
            }}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}