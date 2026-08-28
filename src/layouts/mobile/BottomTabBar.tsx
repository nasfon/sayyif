import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'
import type { ComponentType } from 'react'
import type { SvgIconProps } from '@mui/material/SvgIcon'
import MoreHoriz from '@mui/icons-material/MoreHoriz'

export interface BottomTab {
  key: string
  label: string
  icon: ComponentType<SvgIconProps>
  center?: boolean
  more?: boolean
}

interface BottomTabBarProps {
  tabs: BottomTab[]
  activeKey: string
  moreActive: boolean
  onSelect: (key: string) => void
}

const BAR_HEIGHT = 64

export default function BottomTabBar({ tabs, activeKey, moreActive, onSelect }: BottomTabBarProps) {
  return (
    <Box
      component="nav"
      aria-label="Primary"
      sx={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        height: `calc(${BAR_HEIGHT}px + env(safe-area-inset-bottom))`,
        paddingBottom: 'env(safe-area-inset-bottom)',
        display: 'flex',
        bgcolor: 'background.paper',
        borderTop: 1,
        borderColor: 'divider',
        zIndex: (theme) => theme.zIndex.appBar,
        pb: 'env(safe-area-inset-bottom)',
        pl: 'env(safe-area-inset-left)',
        pr: 'env(safe-area-inset-right)',
      }}
    >
      {tabs.map((tab) => {
        const isActive = tab.more ? moreActive : activeKey === tab.key
        if (tab.center) {
          return (
            <Box
              key={tab.key}
              sx={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
              }}
            >
              <IconButton
                aria-label={tab.label}
                aria-current={isActive ? 'page' : undefined}
                onClick={() => onSelect(tab.key)}
                sx={{
                  position: 'absolute',
                  top: -22,
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  bgcolor: 'primary.main',
                  color: 'primary.contrastText',
                  boxShadow: 3,
                  '&:hover': { bgcolor: 'primary.dark' },
                }}
              >
                <tab.icon fontSize="medium" />
              </IconButton>
              <Typography
                variant="caption"
                sx={{
                  mt: 5.5,
                  fontWeight: 600,
                  color: isActive ? 'primary.main' : 'text.secondary',
                  fontSize: 11,
                }}
              >
                {tab.label}
              </Typography>
            </Box>
          )
        }
        return (
          <Box
            key={tab.key}
            onClick={() => onSelect(tab.key)}
            role="button"
            tabIndex={0}
            aria-current={isActive ? 'page' : undefined}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                onSelect(tab.key)
              }
            }}
            sx={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 0.25,
              cursor: 'pointer',
              color: isActive ? 'primary.main' : 'text.secondary',
              transition: 'color 120ms ease',
              userSelect: 'none',
            }}
          >
            <tab.icon fontSize="small" />
            <Typography
              variant="caption"
              sx={{ fontWeight: 600, fontSize: 11, lineHeight: 1 }}
            >
              {tab.label}
            </Typography>
          </Box>
        )
      })}
    </Box>
  )
}

export { BAR_HEIGHT, MoreHoriz }
