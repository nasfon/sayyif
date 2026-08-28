import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type TouchEvent } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import CircularProgress from '@mui/material/CircularProgress'
import Dashboard from '@mui/icons-material/Dashboard'
import Inventory2 from '@mui/icons-material/Inventory2'
import People from '@mui/icons-material/People'
import PointOfSale from '@mui/icons-material/PointOfSale'
import MoreHoriz from '@mui/icons-material/MoreHoriz'
import Loading from '../../components/feedback/Loading'
import ConfirmationDialog from '../../components/ui/ConfirmationDialog'
import { useAuth } from '../../hooks/useAuth'
import { getNavItems, navItemMap, type NavigateParams, type PageKey } from '../navigation'
import MobileTopBar from './MobileTopBar'
import BottomTabBar, { BAR_HEIGHT, type BottomTab } from './BottomTabBar'
import MoreSheet from './MoreSheet'
import { MobileNavContext, type FabConfig } from './mobileNav'
import FAB from '../../components/mobile/FAB'

const PRIMARY_TABS = ['dashboard', 'products', 'sales', 'customers'] as const
const MODAL_KEYS: PageKey[] = ['sales']
const HIDE_TABS = new Map<PageKey, true>([['receipt', true], ['customer-profile', true]])

const baseTabs: BottomTab[] = [
  { key: 'dashboard', label: 'Home', icon: Dashboard },
  { key: 'products', label: 'Products', icon: Inventory2 },
  { key: 'sales', label: 'New Sale', icon: PointOfSale, center: true },
  { key: 'customers', label: 'Customers', icon: People },
]

export default function MobileLayout() {
  const { profile, logout } = useAuth()
  const [stack, setStack] = useState<{ key: PageKey; params?: NavigateParams }[]>([{ key: 'dashboard' }])
  const [moreOpen, setMoreOpen] = useState(false)
  const [titleOverride, setTitleOverride] = useState<string | null>(null)
  const [showBackOverride, setShowBackOverride] = useState(false)
  const [refreshFn, setRefreshFn] = useState<(() => unknown) | null>(null)
  const [fab, setFab] = useState<FabConfig | null>(null)
  const [pull, setPull] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [exitOpen, setExitOpen] = useState(false)
  const [appClosed, setAppClosed] = useState(false)

  const touchStart = useRef<{ x: number; y: number } | null>(null)
  const gesture = useRef<{ dx: number; dy: number }>({ dx: 0, dy: 0 })

  const items = useMemo(() => getNavItems(profile?.role), [profile?.role])

  const allowedKeys = new Set<string>(items.map((item) => item.key))
  const moreItems = items.filter(
    (item) => !PRIMARY_TABS.includes(item.key as (typeof PRIMARY_TABS)[number]),
  )
  const visibleBottomTabs: BottomTab[] = baseTabs.filter((tab) => allowedKeys.has(tab.key))
  if (moreItems.length > 0) {
    visibleBottomTabs.push({ key: 'more', label: 'More', icon: MoreHoriz, more: true })
  }

  const topEntry = stack[stack.length - 1]
  const topKey = topEntry.key
  const topParams = topEntry.params
  const topIsModal = MODAL_KEYS.includes(topKey)
  const visibleItem = navItemMap.get(topKey) ?? items[0]
  const showBottomBar = !topIsModal && !HIDE_TABS.has(topKey)
  const title = titleOverride ?? visibleItem?.label ?? 'IMS'
  const backVisible = stack.length > 1 || showBackOverride

  const pop = useCallback(() => {
    setPull(0)
    setStack((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev))
  }, [])

  const navigate = useCallback((key: string, params?: NavigateParams) => {
    setPull(0)
    setRefreshing(false)
    setFab(null)
    if (key === 'more') {
      setMoreOpen(true)
      return
    }
    if (MODAL_KEYS.includes(key as PageKey)) {
      setStack((prev) => [...prev, { key: key as PageKey, params }])
      return
    }
    if (PRIMARY_TABS.includes(key as (typeof PRIMARY_TABS)[number])) {
      setStack([{ key: key as PageKey }])
      return
    }
    setStack((prev) => [...prev, { key: key as PageKey, params }])
  }, [])

  const handleHardwareBack = useRef(() => {})
  useEffect(() => {
    handleHardwareBack.current = () => {
      if (appClosed) return
      if (topKey === 'sales') {
        navigate('dashboard')
        return
      }
      if (stack.length > 1) {
        pop()
        return
      }
      setExitOpen(true)
    }
  }, [topKey, stack.length, navigate, pop, appClosed])

  const handleExit = useCallback(() => {
    setExitOpen(false)
    window.close()
    setAppClosed(true)
  }, [])

  useEffect(() => {
    window.history.pushState({ imsRoot: true }, '')
    const onPopState = () => {
      handleHardwareBack.current()
      window.history.pushState({ imsRoot: true }, '')
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  const handleLogout = async () => {
    setSigningOut(true)
    try {
      await logout()
    } finally {
      setSigningOut(false)
    }
  }

  const doRefresh = async () => {
    if (refreshing) return
    setRefreshing(true)
    try {
      await refreshFn?.()
    } finally {
      setRefreshing(false)
      setPull(0)
    }
  }

  const onTouchStart = (event: TouchEvent) => {
    if (window.scrollY > 0 || refreshing) {
      touchStart.current = null
      return
    }
    touchStart.current = { x: event.touches[0].clientX, y: event.touches[0].clientY }
    gesture.current = { dx: 0, dy: 0 }
  }

  const onTouchMove = (event: TouchEvent) => {
    if (!touchStart.current) return
    const dx = event.touches[0].clientX - touchStart.current.x
    const dy = event.touches[0].clientY - touchStart.current.y
    gesture.current = { dx, dy }
    if (dy > 0 && Math.abs(dy) > Math.abs(dx) && pull < 80) {
      setPull(Math.min(dy * 0.5, 80))
    }
  }

  const onTouchEnd = () => {
    if (!touchStart.current) return
    const { dx, dy } = gesture.current
    if (dy > 60) {
      void doRefresh()
    } else if (touchStart.current.x < 40 && dx > 70 && Math.abs(dx) > Math.abs(dy) && stack.length > 1) {
      pop()
    }
    touchStart.current = null
    if (pull > 0 && dy <= 60) setPull(0)
  }

  const navValue = useMemo(
    () => ({
      isMobile: true,
      setTitle: (value: string | null) => setTitleOverride(value),
      setShowBack: (value: boolean) => setShowBackOverride(value),
      setRefresh: (value: (() => unknown) | null) => setRefreshFn(value),
      setFab: (value: FabConfig | null) => setFab(value),
      navigate: (key: PageKey, params?: NavigateParams) => navigate(key, params),
      params: topParams,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [topParams],
  )

  if (appClosed) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 2,
          p: 3,
          textAlign: 'center',
          bgcolor: 'background.default',
        }}
      >
        <Typography variant="h6">App closed</Typography>
        <Typography color="text.secondary">The app has been closed.</Typography>
        <Button variant="contained" onClick={() => window.location.reload()}>
          Reopen
        </Button>
      </Box>
    )
  }

  return (
    <MobileNavContext.Provider value={navValue}>
      <Box
        sx={{
          minHeight: '100vh',
          bgcolor: 'background.default',
          overflowX: 'clip',
          pb: showBottomBar ? `calc(${BAR_HEIGHT}px + env(safe-area-inset-bottom) + 16px)` : 'env(safe-area-inset-bottom)',
        }}
      >
        <MobileTopBar
          title={title}
          showBack={backVisible}
          onBack={pop}
          profile={profile}
          signingOut={signingOut}
          onLogout={handleLogout}
        />

          <Box
            component="main"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            sx={{
              pl: 'calc(16px + env(safe-area-inset-left))',
              pr: 'calc(16px + env(safe-area-inset-right))',
              pt: `calc(56px + env(safe-area-inset-top) + 12px)`,
              transform: pull > 0 ? `translateY(${pull}px)` : undefined,
              transition: refreshing ? 'transform 200ms ease' : undefined,
            }}
          >
          {(pull > 0 || refreshing) && (
            <Box
              sx={{
                position: 'fixed',
                top: `calc(56px + env(safe-area-inset-top) + 12px)`,
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: (theme) => theme.zIndex.appBar - 1,
                opacity: Math.min(pull / 60, 1),
                pointerEvents: 'none',
              }}
            >
              <CircularProgress size={Math.max(20, Math.min(pull, 36))} />
            </Box>
          )}

          {visibleItem?.Page ? (
            <Box
              key={topKey}
              className={topIsModal ? 'mobile-slide-up' : 'mobile-slide-right'}
            >
              <Suspense fallback={<Loading />}>
                <visibleItem.Page onNavigate={navigate} />
              </Suspense>
            </Box>
          ) : (
            <Box sx={{ p: 2 }}>
              <Typography color="text.secondary">{visibleItem?.placeholder ?? 'Coming soon.'}</Typography>
            </Box>
          )}
        </Box>

        {showBottomBar && (
          <BottomTabBar
            tabs={visibleBottomTabs}
            activeKey={topKey}
            moreActive={!PRIMARY_TABS.includes(topKey as (typeof PRIMARY_TABS)[number])}
            onSelect={(key) => navigate(key as PageKey)}
          />
        )}

        {showBottomBar && fab && (
          <FAB
            icon={fab.icon}
            label={fab.label}
            color={fab.color}
            onClick={fab.onClick}
          />
        )}

        <MoreSheet
          open={moreOpen}
          onClose={() => setMoreOpen(false)}
          items={moreItems}
          activeKey={topKey}
          onSelect={(key) => {
            navigate(key)
            setMoreOpen(false)
          }}
        />

        <ConfirmationDialog
          open={exitOpen}
          title="Exit app?"
          message="Are you sure you want to exit the app?"
          confirmLabel="Yes, exit"
          cancelLabel="No"
          confirmColor="error"
          onConfirm={handleExit}
          onCancel={() => setExitOpen(false)}
        />
      </Box>
    </MobileNavContext.Provider>
  )
}
