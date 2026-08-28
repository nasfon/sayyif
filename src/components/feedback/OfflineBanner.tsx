import Alert from '@mui/material/Alert'
import WifiOff from '@mui/icons-material/WifiOff'
import { useOnlineStatus } from '../../hooks/useOnlineStatus'

export default function OfflineBanner() {
  const online = useOnlineStatus()

  if (online) return null

return (
    <Alert severity="warning" icon={<WifiOff fontSize="small" />}>
      {'You\'re offline. Some actions may not be available until your connection is restored.'}
    </Alert>
  )
}