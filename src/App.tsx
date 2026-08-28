import useMediaQuery from '@mui/material/useMediaQuery'
import LoginPage from './features/auth/LoginPage'
import DashboardLayout from './layouts/DashboardLayout'
import MobileLayout from './layouts/mobile/MobileLayout'
import Loading from './components/feedback/Loading'
import { useAuth } from './hooks/useAuth'

const MOBILE_MAX_WIDTH = 768

function App() {
  const { initializing, user } = useAuth()
  const isMobile = useMediaQuery(`(max-width: ${MOBILE_MAX_WIDTH}px)`)

  if (initializing) {
    return <Loading />
  }

  if (!user) {
    return <LoginPage />
  }

  return isMobile ? <MobileLayout /> : <DashboardLayout />
}

export default App
