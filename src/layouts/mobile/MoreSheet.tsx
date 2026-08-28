import Box from '@mui/material/Box'
import Drawer from '@mui/material/Drawer'
import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import Typography from '@mui/material/Typography'
import type { NavItem } from '../navigation'

interface MoreSheetProps {
  open: boolean
  onClose: () => void
  items: NavItem[]
  activeKey: string
  onSelect: (key: NavItem['key']) => void
}

export default function MoreSheet({ open, onClose, items, activeKey, onSelect }: MoreSheetProps) {
  return (
    <Drawer anchor="bottom" open={open} onClose={onClose}>
      <Box
        sx={{
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          bgcolor: 'background.paper',
          maxHeight: '80vh',
          pb: 'env(safe-area-inset-bottom)',
          pl: 'env(safe-area-inset-left)',
          pr: 'env(safe-area-inset-right)',
        }}
        role="dialog"
        aria-label="More"
      >
        <Box
          sx={{
            width: 40,
            height: 4,
            borderRadius: 2,
            bgcolor: 'divider',
            mx: 'auto',
            mt: 1.5,
            mb: 1,
          }}
        />
        <Typography variant="h6" sx={{ px: 2, pb: 1, fontWeight: 700 }}>
          More
        </Typography>
        <List sx={{ py: 0 }}>
          {items.map((item) => {
            const isActive = activeKey === item.key
            return (
              <ListItemButton
                key={item.key}
                selected={isActive}
                onClick={() => onSelect(item.key)}
                sx={{ py: 1.25 }}
              >
                <ListItemIcon sx={{ minWidth: 40, color: isActive ? 'primary.main' : 'text.secondary' }}>
                  <item.icon fontSize="small" />
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Typography component="span" sx={{ fontWeight: isActive ? 700 : 500 }}>
                      {item.label}
                    </Typography>
                  }
                />
              </ListItemButton>
            )
          })}
        </List>
      </Box>
    </Drawer>
  )
}
