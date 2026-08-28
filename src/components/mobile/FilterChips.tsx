import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'

export interface FilterChipOption<T extends string> {
  value: T
  label: string
}

interface FilterChipsProps<T extends string> {
  options: FilterChipOption<T>[]
  value: T
  onChange: (value: T) => void
}

export default function FilterChips<T extends string>({ options, value, onChange }: FilterChipsProps<T>) {
  return (
    <Box
      sx={{
        display: 'flex',
        gap: 1,
        overflowX: 'auto',
        pb: 0.5,
        mx: -2,
        px: 2,
        '&::-webkit-scrollbar': { display: 'none' },
        scrollbarWidth: 'none',
      }}
    >
      {options.map((option) => {
        const selected = option.value === value
        return (
          <Chip
            key={option.value}
            label={option.label}
            clickable
            onClick={() => onChange(option.value)}
            color={selected ? 'primary' : 'default'}
            variant={selected ? 'filled' : 'outlined'}
            sx={{ flexShrink: 0, fontWeight: 600, px: 0.5 }}
          />
        )
      })}
    </Box>
  )
}
