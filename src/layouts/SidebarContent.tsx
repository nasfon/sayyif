import Box from '@mui/material/Box'
import Divider from '@mui/material/Divider'
import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import Logout from '@mui/icons-material/Logout'
import Logo from '../components/ui/Logo'
import { type NavItem, type NavigateParams, type PageKey } from './navigation'

interface SidebarContentProps {
  items: NavItem[]
  activeKey: PageKey
  collapsed: boolean
  onNavigate: (key: PageKey, params?: NavigateParams) => void
  onLogout: () => void
  signingOut: boolean
}

export default function SidebarContent({
  items,
  activeKey,
  collapsed,
  onNavigate,
  onLogout,
  signingOut,
}: SidebarContentProps) {
  const navButton = (item: NavItem) => (
    <ListItemButton
      selected={item.key === activeKey}
      onClick={() => onNavigate(item.key)}
      sx={{
        borderRadius: 2,
        mb: 0.5,
        justifyContent: collapsed ? 'center' : undefined,
        px: collapsed ? 1 : 2,
      }}
    >
      <ListItemIcon sx={{ minWidth: 0, mr: collapsed ? 0 : 1.5, justifyContent: 'center' }}>
        <item.icon />
      </ListItemIcon>
      {!collapsed && <ListItemText primary={item.label} />}
    </ListItemButton>
  )

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box
        sx={{
          minHeight: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'flex-start',
          px: collapsed ? 1 : 2,
          gap: 1.5,
        }}
      >
        <Logo size={32} />
        {!collapsed && (
          <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b' }}>
            IMS
          </Typography>
        )}
      </Box>
      <Divider />
      <List sx={{ flexGrow: 1, px: 1, pt: 1 }}>
        {items.map((item) =>
          collapsed ? (
            <Tooltip key={item.key} title={item.label} placement="right">
              {navButton(item)}
            </Tooltip>
          ) : (
            <span key={item.key}>{navButton(item)}</span>
          ),
        )}
      </List>
      <Divider />
      <List sx={{ px: 1, pb: 1 }}>
        {collapsed ? (
          <Tooltip title="Logout" placement="right">
            <ListItemButton onClick={onLogout} disabled={signingOut} sx={{ borderRadius: 2, px: 1, justifyContent: 'center' }}>
              <ListItemIcon sx={{ minWidth: 0, justifyContent: 'center' }}>
                <Logout />
              </ListItemIcon>
            </ListItemButton>
          </Tooltip>
        ) : (
          <ListItemButton onClick={onLogout} disabled={signingOut} sx={{ borderRadius: 2, px: 2 }}>
            <ListItemIcon sx={{ minWidth: 0, mr: 1.5 }}>
              <Logout />
            </ListItemIcon>
            <ListItemText primary="Logout" />
          </ListItemButton>
        )}
      </List>
    </Box>
  )
}