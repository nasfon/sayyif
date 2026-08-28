import Chip from '@mui/material/Chip'
import type { ChipProps } from '@mui/material/Chip'

interface StatusBadgeProps {
  label: string
  color?: ChipProps['color']
}

export default function StatusBadge({ label, color = 'default' }: StatusBadgeProps) {
  return <Chip label={label} color={color} size="small" variant="outlined" />
}