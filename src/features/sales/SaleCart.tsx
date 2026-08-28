import { useState } from 'react'
import Add from '@mui/icons-material/Add'
import DeleteOutlined from '@mui/icons-material/DeleteOutlined'
import Remove from '@mui/icons-material/Remove'
import Box from '@mui/material/Box'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { formatCurrency } from '../../lib/utils'

export interface CartLine {
  product_id: string
  name: string
  sku: string
  unit_price: number
  quantity: number
  available: number
}

interface SaleCartProps {
  items: CartLine[]
  onChangeQuantity: (productId: string, quantity: number) => void
  onRemove: (productId: string) => void
}

export default function SaleCart({ items, onChangeQuantity, onRemove }: SaleCartProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')

  const total = items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0)

  const startEditing = (item: CartLine) => {
    setEditingId(item.product_id)
    setDraft(String(item.quantity))
  }

  const commitEditing = (item: CartLine) => {
    const parsed = Math.trunc(Number(draft))
    if (Number.isFinite(parsed) && parsed >= 1) {
      onChangeQuantity(item.product_id, Math.min(parsed, item.available))
    }
    setEditingId(null)
  }

  if (items.length === 0) {
    return (
      <Paper sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          Cart is empty. Search and add products above.
        </Typography>
      </Paper>
    )
  }

  return (
    <Paper sx={{ overflow: 'hidden' }}>
      <Stack divider={<Divider />}>
        {items.map((item) => (
          <Stack
            key={item.product_id}
            direction="row"
            spacing={1.5}
            sx={{ alignItems: 'center', px: 2.5, py: 1.5 }}
          >
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography noWrap variant="body2" sx={{ fontWeight: 600 }}>
                {item.name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {formatCurrency(item.unit_price)}
              </Typography>
            </Box>

            <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
              <IconButton
                size="small"
                aria-label="Decrease quantity"
                onClick={() => onChangeQuantity(item.product_id, item.quantity - 1)}
                disabled={item.quantity <= 1}
              >
                <Remove fontSize="small" />
              </IconButton>
              {editingId === item.product_id ? (
                <TextField
                  autoFocus
                  type="number"
                  inputMode="numeric"
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onBlur={() => commitEditing(item)}
                  onFocus={(event) => event.target.select()}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      commitEditing(item)
                    }
                  }}
                  slotProps={{ htmlInput: { min: 1, step: 1, inputMode: 'numeric' } }}
                  size="small"
                  sx={{ width: 56 }}
                />
              ) : (
                <Typography
                  variant="body2"
                  role="button"
                  tabIndex={0}
                  aria-label="Edit quantity"
                  onClick={() => startEditing(item)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      startEditing(item)
                    }
                  }}
                  sx={{
                    minWidth: 28,
                    textAlign: 'center',
                    fontWeight: 600,
                    cursor: 'pointer',
                    userSelect: 'none',
                  }}
                >
                  {item.quantity}
                </Typography>
              )}
              <IconButton
                size="small"
                aria-label="Increase quantity"
                onClick={() => onChangeQuantity(item.product_id, item.quantity + 1)}
                disabled={item.quantity >= item.available}
              >
                <Add fontSize="small" />
              </IconButton>
            </Stack>

            <Typography
              variant="body2"
              sx={{ minWidth: 90, textAlign: 'right', fontWeight: 700 }}
            >
              {formatCurrency(item.unit_price * item.quantity)}
            </Typography>

            <IconButton
              size="small"
              aria-label="Remove item"
              onClick={() => onRemove(item.product_id)}
              sx={{ color: 'text.secondary', ml: 0.5 }}
            >
              <DeleteOutlined fontSize="small" />
            </IconButton>
          </Stack>
        ))}
      </Stack>

      <Divider />
      <Stack
        direction="row"
        sx={{ justifyContent: 'space-between', px: 2, py: 1.5 }}
      >
        <Typography variant="body2" color="text.secondary">
          Total
        </Typography>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          {formatCurrency(total)}
        </Typography>
      </Stack>
    </Paper>
  )
}
