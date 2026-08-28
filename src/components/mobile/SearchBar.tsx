import { useEffect, useRef, useState } from 'react'
import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import TextField from '@mui/material/TextField'
import Search from '@mui/icons-material/Search'
import Close from '@mui/icons-material/Close'

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export default function SearchBar({ value, onChange, placeholder = 'Search' }: SearchBarProps) {
  const [expanded, setExpanded] = useState(value.length > 0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (expanded) {
      inputRef.current?.focus()
    }
  }, [expanded])

  const collapse = () => {
    onChange('')
    setExpanded(false)
  }

  if (!expanded) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <IconButton
          aria-label="Search"
          onClick={() => setExpanded(true)}
          sx={{ width: 44, height: 44 }}
        >
          <Search />
        </IconButton>
      </Box>
    )
  }

  return (
    <TextField
      fullWidth
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      autoFocus
      slotProps={{
        input: {
          ref: inputRef,
          startAdornment: (
            <InputAdornment position="start">
              <Search fontSize="small" />
            </InputAdornment>
          ),
          endAdornment: value ? (
            <InputAdornment position="end">
              <IconButton aria-label="Clear search" onClick={collapse} edge="end" sx={{ width: 36, height: 36 }}>
                <Close fontSize="small" />
              </IconButton>
            </InputAdornment>
          ) : undefined,
        },
      }}
      sx={{ '& .MuiInputBase-root': { borderRadius: 2 } }}
    />
  )
}
