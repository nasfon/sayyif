import { useEffect, useState } from 'react'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import InputAdornment from '@mui/material/InputAdornment'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import Add from '@mui/icons-material/Add'
import CheckCircle from '@mui/icons-material/CheckCircle'
import Search from '@mui/icons-material/Search'
import { useProductsList } from '../../hooks/useProducts'
import { formatCurrency } from '../../lib/utils'
import type { ProductRecord } from '../../types/products'

interface ProductPickerProps {
  shopId: string
  addedIds: string[]
  onAdd: (product: ProductRecord) => void
}

export default function ProductPicker({ shopId, addedIds, onAdd }: ProductPickerProps) {
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')

  const { data, isLoading, isPlaceholderData } = useProductsList({
    page: 0,
    pageSize: 6,
    search,
    status: 'active',
    shopId,
  })

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  const results = data?.rows ?? []
  const addedSet = new Set(addedIds)

  return (
    <Stack spacing={1}>
      <Typography variant="subtitle2">Products</Typography>
      <TextField
        value={searchInput}
        onChange={(event) => setSearchInput(event.target.value)}
        placeholder="Search products by name or SKU"
        size="small"
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <Search fontSize="small" />
              </InputAdornment>
            ),
          },
        }}
      />
      {search ? (
        isLoading || isPlaceholderData ? (
          <CircularProgress size={20} />
        ) : results.length > 0 ? (
          <Stack spacing={1}>
            {results.map((product) => {
              const added = addedSet.has(product.id)
              return (
                <Paper key={product.id} variant="outlined" sx={{ p: 1.5 }}>
                  <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                    <Stack sx={{ flex: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {product.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {product.sku} · {formatCurrency(product.selling_price)} · {product.quantity} in stock
                      </Typography>
                    </Stack>
                    <Button
                      size="small"
                      variant={added ? 'text' : 'contained'}
                      disabled={added || product.quantity <= 0}
                      startIcon={added ? <CheckCircle /> : <Add />}
                      onClick={() => {
                        onAdd(product)
                        setSearchInput('')
                        setSearch('')
                      }}
                    >
                      {added ? 'Added' : 'Add'}
                    </Button>
                  </Stack>
                </Paper>
              )
            })}
          </Stack>
        ) : (
          <Typography variant="body2" color="text.secondary">
            No products found.
          </Typography>
        )
      ) : (
        <Typography variant="body2" color="text.secondary">
          Type to search for products to add to the sale.
        </Typography>
      )}
    </Stack>
  )
}