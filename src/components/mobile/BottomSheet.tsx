import type { ReactNode } from 'react'
import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import Modal from '@mui/material/Modal'
import Typography from '@mui/material/Typography'
import Close from '@mui/icons-material/Close'

interface BottomSheetProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  footer?: ReactNode
}

export default function BottomSheet({ open, onClose, title, children, footer }: BottomSheetProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      slotProps={{ backdrop: { sx: { bgcolor: 'rgba(0,0,0,0.4)' } } }}
      sx={{
        zIndex: (theme) => theme.zIndex.appBar + 2,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
      }}
    >
      <Box
        className="mobile-slide-up"
        sx={{
          bgcolor: 'background.paper',
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          pb: 'env(safe-area-inset-bottom)',
          outline: 'none',
        }}
        role="dialog"
        aria-modal="true"
      >
        <Box
          sx={{
            pt: 1,
            pb: 1.5,
            px: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: 1,
            borderColor: 'divider',
          }}
        >
          <Box sx={{ width: 36, flexShrink: 0 }} />
          <Box
            sx={{
              width: 36,
              height: 4,
              borderRadius: 2,
              bgcolor: 'divider',
              position: 'absolute',
              top: 8,
              left: '50%',
              transform: 'translateX(-50%)',
            }}
          />
          <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.05rem', flex: 1, textAlign: 'center' }}>
            {title}
          </Typography>
          <IconButton aria-label="Close" onClick={onClose} sx={{ width: 36, height: 36 }}>
            <Close fontSize="small" />
          </IconButton>
        </Box>
        <Box sx={{ px: 2, py: 2, overflowY: 'auto' }}>{children}</Box>
        {footer && (
          <Box sx={{ px: 2, pb: 2, pt: 0.5, borderTop: 1, borderColor: 'divider' }}>{footer}</Box>
        )}
      </Box>
    </Modal>
  )
}
