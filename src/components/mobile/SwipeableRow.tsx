import { useRef, useState, type ReactNode } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import type { ComponentType } from 'react'
import type { SvgIconProps } from '@mui/material/SvgIcon'

export interface SwipeAction {
  key: string
  label: string
  icon: ComponentType<SvgIconProps>
  color?: 'primary' | 'error' | 'success' | 'warning' | 'default'
  onClick: () => void
}

interface SwipeableRowProps {
  children: ReactNode
  actions: SwipeAction[]
  onClick?: () => void
}

const ACTION_WIDTH = 76
const OPEN_THRESHOLD = 0.4

export default function SwipeableRow({ children, actions, onClick }: SwipeableRowProps) {
  const maxWidth = actions.length * ACTION_WIDTH
  const [open, setOpen] = useState(false)
  const [offset, setOffset] = useState(0)
  const [dragging, setDragging] = useState(false)
  const startX = useRef(0)
  const moved = useRef(false)

  const handleDown = (event: React.PointerEvent) => {
    startX.current = event.clientX
    moved.current = false
    setDragging(true)
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handleMove = (event: React.PointerEvent) => {
    if (!dragging) return
    const dx = event.clientX - startX.current
    if (Math.abs(dx) > 4) moved.current = true
    setOffset(Math.min(0, Math.max(-maxWidth, dx)))
  }

  const settle = (event?: React.PointerEvent) => {
    if (!dragging) return
    setDragging(false)
    if (event && event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    const next = offset <= -maxWidth * OPEN_THRESHOLD
    setOpen(next)
    setOffset(next ? -maxWidth : 0)
  }

  const handleClick = () => {
    if (moved.current) {
      moved.current = false
      return
    }
    if (open) {
      setOpen(false)
      setOffset(0)
      return
    }
    onClick?.()
  }

  return (
    <Box
      sx={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 1.5,
        mb: 1.5,
        '&:last-child': { mb: 0 },
        transition: dragging ? 'none' : 'transform 200ms ease',
      }}
      onPointerLeave={settle}
      onPointerCancel={settle}
    >
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          right: 0,
          bottom: 0,
          width: maxWidth,
          display: 'flex',
          zIndex: 1,
        }}
      >
        {actions.map((action) => {
          const Icon = action.icon
          return (
            <Box
              key={action.key}
              onClick={(event) => {
                event.stopPropagation()
                action.onClick()
                setOpen(false)
                setOffset(0)
              }}
              sx={{
                width: ACTION_WIDTH,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 0.25,
                bgcolor:
                  action.color === 'error'
                    ? 'error.main'
                    : action.color === 'default'
                      ? 'action.hover'
                      : `${action.color ?? 'primary'}.main`,
                color: action.color === 'default' ? 'text.secondary' : 'primary.contrastText',
                cursor: 'pointer',
              }}
            >
              <Icon fontSize="small" />
              <Typography variant="caption" sx={{ fontSize: 11, fontWeight: 600 }}>
                {action.label}
              </Typography>
            </Box>
          )
        })}
      </Box>

      <Box
        onPointerDown={handleDown}
        onPointerMove={handleMove}
        onPointerUp={settle}
        onClick={handleClick}
        onLostPointerCapture={() => settle()}
        sx={{
          position: 'relative',
          zIndex: 2,
          transform: `translateX(${offset}px)`,
          transition: dragging ? 'none' : 'transform 200ms ease',
          touchAction: 'pan-y',
          cursor: onClick ? 'pointer' : 'default',
        }}
      >
        {children}
      </Box>
    </Box>
  )
}
