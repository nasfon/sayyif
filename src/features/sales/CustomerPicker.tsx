import { useEffect, useState } from 'react'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import InputAdornment from '@mui/material/InputAdornment'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import Search from '@mui/icons-material/Search'
import { useCustomersList } from '../../hooks/useCustomers'
import type { CustomerRecord } from '../../types/customers'

interface CustomerPickerProps {
  shopId: string
  value: CustomerRecord | null
  onChange: (customer: CustomerRecord | null) => void
}

export default function CustomerPicker({ shopId, value, onChange }: CustomerPickerProps) {
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')

  const { data, isLoading, isPlaceholderData } = useCustomersList({
    page: 0,
    pageSize: 5,
    search,
    shopId,
  })

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  if (value) {
    return (
      <Stack spacing={1}>
        <Typography variant="subtitle2">Customer</Typography>
        <Paper variant="outlined" sx={{ p: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Stack>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {value.full_name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {value.phone}
            </Typography>
          </Stack>
          <Button size="small" onClick={() => onChange(null)}>
            Walk-in
          </Button>
        </Paper>
      </Stack>
    )
  }

  const matches = data?.rows ?? []

  return (
    <Stack spacing={1}>
      <Typography variant="subtitle2">Customer</Typography>
      <TextField
        value={searchInput}
        onChange={(event) => setSearchInput(event.target.value)}
        placeholder="Search customer by name or phone"
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
      <Typography variant="caption" color="text.secondary">
        Selling as walk-in (no customer). Search to attach a customer.
      </Typography>
      {search ? (
        isLoading || isPlaceholderData ? (
          <CircularProgress size={20} />
        ) : matches.length > 0 ? (
          <Stack spacing={0.5}>
            {matches.map((customer) => (
              <Button
                key={customer.id}
                variant="outlined"
                color="inherit"
                size="small"
                sx={{ justifyContent: 'flex-start', textTransform: 'none' }}
                onClick={() => onChange(customer)}
              >
                <Stack sx={{ alignItems: 'flex-start' }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {customer.full_name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {customer.phone}
                  </Typography>
                </Stack>
              </Button>
            ))}
          </Stack>
        ) : (
          <Typography variant="body2" color="text.secondary">
            No customers found.
          </Typography>
        )
      ) : null}
    </Stack>
  )
}