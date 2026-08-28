import { lazy, Suspense, useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import Box from '@mui/material/Box'
import MenuItem from '@mui/material/MenuItem'
import Paper from '@mui/material/Paper'
import Select, { type SelectChangeEvent } from '@mui/material/Select'
import Typography from '@mui/material/Typography'
import Loading from '../../components/feedback/Loading'
import PageHeader from '../../components/ui/PageHeader'
import { useAuth } from '../../hooks/useAuth'
import { useShops } from '../../hooks/useShops'
import { useMobileNav } from '../../layouts/mobile/mobileNav'
import { useBusinessSettings, useUpdateBusinessSettings } from '../../hooks/useSettings'
import { getApiErrorMessage } from '../../lib/errors'
import { businessSettingsSchema, type BusinessSettingsFormValues } from './settingsSchema'
import BusinessSettingsForm from './BusinessSettingsForm'

const MobileSettingsScreen = lazy(() => import('./MobileSettingsScreen'))

export default function SettingsPage() {
  const { profile, user } = useAuth()
  const shopsQuery = useShops()
  const shops = shopsQuery.data ?? []
  const mobileNav = useMobileNav()
  const isMobile = mobileNav.isMobile

  const isSuperAdmin = profile?.role === 'super_admin'

  const [selectedShopId, setSelectedShopId] = useState(profile?.shop_id ?? '')
  const [submitError, setSubmitError] = useState<string | null>(null)

  const ownShopId = profile?.shop_id ?? ''
  const fallbackShopId = isSuperAdmin ? (shops[0]?.id ?? '') : ownShopId
  const activeShopId = selectedShopId || fallbackShopId

  const settingsQuery = useBusinessSettings(activeShopId || undefined)
  const updateSettings = useUpdateBusinessSettings()

  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<BusinessSettingsFormValues>({
    resolver: zodResolver(businessSettingsSchema),
    defaultValues: {
      business_name: '',
      phone: '',
      address: '',
      logo_url: '',
      receipt_footer: '',
    },
  })

  useEffect(() => {
    if (settingsQuery.data) {
      const data = settingsQuery.data
      reset({
        business_name: data.business_name ?? '',
        phone: data.phone ?? '',
        address: data.address ?? '',
        logo_url: data.logo_url ?? '',
        receipt_footer: data.receipt_footer ?? '',
      })
    }
  }, [settingsQuery.data, reset])

  const handleShopChange = (event: SelectChangeEvent<string>) => {
    setSelectedShopId(event.target.value)
  }

  const handleSave = async (values: BusinessSettingsFormValues) => {
    if (!activeShopId) return
    setSubmitError(null)
    try {
      await updateSettings.mutateAsync({
        shop_id: activeShopId,
        business_name: values.business_name,
        phone: values.phone || undefined,
        address: values.address || undefined,
        logo_url: values.logo_url || undefined,
        receipt_footer: values.receipt_footer || undefined,
        updated_by: user?.id ?? null,
      })
    } catch (error) {
      setSubmitError(getApiErrorMessage(error))
    }
  }

  return (
    <Box>
      {isMobile ? (
        <Suspense fallback={<Loading />}>
          <MobileSettingsScreen />
        </Suspense>
      ) : (
        <Box>
          <PageHeader title="Business Settings" subtitle="Manage your business profile, logo, contact, and receipt footer" />

      {isSuperAdmin && (
        <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
          <Typography variant="caption" color="text.secondary">
            Shop
          </Typography>
          <Select value={activeShopId} onChange={handleShopChange} displayEmpty size="small" fullWidth>
            <MenuItem value="">Select a shop</MenuItem>
            {shops.map((shop) => (
              <MenuItem key={shop.id} value={shop.id}>
                {shop.name}
              </MenuItem>
            ))}
          </Select>
        </Paper>
      )}

      {settingsQuery.isLoading ? (
        <Loading label="Loading settings..." />
      ) : (
        <Paper variant="outlined" sx={{ p: 3 }}>
          <BusinessSettingsForm
            control={control}
            handleSubmit={handleSubmit}
            onSubmit={handleSave}
            isSubmitting={isSubmitting || updateSettings.isPending}
            submitError={submitError}
          />
        </Paper>
      )}
        </Box>
      )}
    </Box>
  )
}
