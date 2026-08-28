import { useState } from 'react'
import AppBar from '@mui/material/AppBar'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import ListItemIcon from '@mui/material/ListItemIcon'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import Logout from '@mui/icons-material/Logout'
import ArrowBack from '@mui/icons-material/ArrowBack'
import Logo from '../../components/ui/Logo'
import StatusBadge from '../../components/ui/StatusBadge'
import type { UserProfile } from '../../types/auth'

interface MobileTopBarProps {
  title: string
  showBack: boolean
  onBack?: () => void
  profile: UserProfile | null
  signingOut: boolean
  onLogout: () => void
}

export default function MobileTopBar({
  title,
  showBack,
  onBack,
  profile,
  signingOut,
  onLogout,
}: MobileTopBarProps) {
  const [menu, setMenu] = useState<HTMLElement | null>(null)
  const roleColor =
    profile?.role === 'super_admin' ? 'error' : profile?.role === 'shop_admin' ? 'primary' : 'secondary'

  return (
     <AppBar
       position="fixed"
       color="inherit"
       sx={{
         zIndex: (theme) => theme.zIndex.drawer + 1,
         borderBottom: 1,
         borderColor: 'divider',
         pt: 'env(safe-area-inset-top)',
         pl: 'calc(8px + env(safe-area-inset-left))',
         pr: 'calc(8px + env(safe-area-inset-right))',
       }}
     >
       <Toolbar sx={{ gap: 1, minHeight: 56, px: 0 }}>
        {showBack ? (
          <IconButton edge="start" color="inherit" aria-label="Back" onClick={onBack}>
            <ArrowBack />
          </IconButton>
        ) : (
          <Logo size={28} />
        )}
        <Typography variant="h6" noWrap sx={{ fontWeight: 700, flexGrow: 1, fontSize: '1.05rem' }}>
          {title}
        </Typography>
        <IconButton
          edge="end"
          color="inherit"
          aria-label="Account menu"
          onClick={(event) => setMenu(event.currentTarget)}
        >
          <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
            {profile?.full_name?.charAt(0)?.toUpperCase() ?? '?'}
          </Avatar>
        </IconButton>
      </Toolbar>
      <Menu
        anchorEl={menu}
        open={Boolean(menu)}
        onClose={() => setMenu(null)}
        slotProps={{ paper: { sx: { minWidth: 240 } } }}
      >
        <Box sx={{ px: 2, py: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {profile?.full_name}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {profile?.email}
          </Typography>
          <Box sx={{ mt: 1 }}>
            <StatusBadge label={profile?.role?.replace('_', ' ') ?? ''} color={roleColor} />
          </Box>
        </Box>
        <MenuItem
          onClick={() => {
            setMenu(null)
            onLogout()
          }}
          disabled={signingOut}
        >
          <ListItemIcon>
            <Logout fontSize="small" />
          </ListItemIcon>
          Logout
        </MenuItem>
      </Menu>
    </AppBar>
  )
}
