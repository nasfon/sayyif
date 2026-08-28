import { useMemo } from 'react'
import Box from '@mui/material/Box'
import Fab from '@mui/material/Fab'
import Typography from '@mui/material/Typography'
import type { ComponentType } from 'react'
import type { SvgIconProps } from '@mui/material/SvgIcon'
import { BAR_HEIGHT } from '../../layouts/mobile/BottomTabBar'

interface FABProps {
  icon: ComponentType<SvgIconProps>
  label?: string
  color?: 'primary' | 'secondary' | 'error' | 'success' | 'warning' | 'info'
  onClick: () => void
}

const FAB_BOTTOM = `calc(${BAR_HEIGHT}px + env(safe-area-inset-bottom) + 16px)`

export default function FAB({ icon: Icon, label, color = 'primary', onClick }: FABProps) {
  const style = useMemo(
    () => ({
      position: 'fixed' as const,
      right: 'calc(16px + env(safe-area-inset-right))',
      bottom: FAB_BOTTOM,
      zIndex: 1200,
    }),
    [],
  )

  if (label) {
    return (
      <Box
        onClick={onClick}
        sx={{
          ...style,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 1,
          bgcolor: `${color}.main`,
          color: 'primary.contrastText',
          px: 2,
          height: 56,
          borderRadius: 28,
          boxShadow: 3,
          minWidth: 56,
          '&:active': { transform: 'scale(0.97)' },
          transition: 'transform 120ms ease',
        }}
      >
        <Icon fontSize="medium" />
        <Typography sx={{ fontWeight: 600, fontSize: '0.95rem', whiteSpace: 'nowrap', pr: 0.5 }}>
          {label}
        </Typography>
      </Box>
    )
  }

  return (
    <Fab
      color={color}
      aria-label="Add"
      onClick={onClick}
      sx={{ ...style, width: 56, height: 56 }}
    >
      <Icon fontSize="medium" />
    </Fab>
  )
}
