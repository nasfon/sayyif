import type { ComponentType } from 'react'
import type { SvgIconProps } from '@mui/material/SvgIcon'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'

interface MobileStatCardProps {
  icon: ComponentType<SvgIconProps>
  label: string
  value: string
  caption?: string
  color?: 'primary' | 'success' | 'warning' | 'error' | 'secondary' | 'info'
}

export default function MobileStatCard({ icon: Icon, label, value, caption, color = 'primary' }: MobileStatCardProps) {
  return (
    <Box
      sx={{
        p: 1.5,
        borderRadius: 2,
        border: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper',
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
        minWidth: 0,
      }}
    >
      <Box
        sx={{
          width: 36,
          height: 36,
          borderRadius: 1.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: `${color}.main`,
          color: 'primary.contrastText',
          flexShrink: 0,
        }}
      >
        <Icon fontSize="small" />
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
          {label}
        </Typography>
        <Typography
          variant="h6"
          noWrap
          sx={{ fontWeight: 700, lineHeight: 1.2, fontSize: '1.15rem', overflow: 'hidden', textOverflow: 'ellipsis' }}
        >
          {value}
        </Typography>
        {caption && (
          <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
            {caption}
          </Typography>
        )}
      </Box>
    </Box>
  )
}
