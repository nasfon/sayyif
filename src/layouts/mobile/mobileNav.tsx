import type { ComponentType } from 'react'
import type { SvgIconProps } from '@mui/material/SvgIcon'
import { createContext, useContext } from 'react'
import type { NavigateParams, PageKey } from '../navigation'

export interface FabConfig {
  icon: ComponentType<SvgIconProps>
  label?: string
  onClick: () => void
  color?: 'primary' | 'secondary' | 'error' | 'success' | 'warning' | 'info'
}

export interface MobileNavValue {
  isMobile: boolean
  setTitle: (title: string | null) => void
  setShowBack: (show: boolean) => void
  setRefresh: (refresh: (() => unknown) | null) => void
  setFab: (fab: FabConfig | null) => void
  navigate: (key: PageKey, params?: NavigateParams) => void
  params?: NavigateParams
}

const noop = () => {}

const defaultValue: MobileNavValue = {
  isMobile: false,
  setTitle: noop,
  setShowBack: noop,
  setRefresh: noop,
  setFab: noop,
  navigate: noop,
}

export const MobileNavContext = createContext<MobileNavValue>(defaultValue)

export function useMobileNav() {
  return useContext(MobileNavContext)
}
