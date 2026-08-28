import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'

interface LoadingProps {
  label?: string
}

export default function Loading({ label }: LoadingProps) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, py: 8 }}>
      <CircularProgress size={32} />
      {label && <span>{label}</span>}
    </Box>
  )
}