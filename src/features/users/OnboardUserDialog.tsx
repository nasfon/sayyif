import { useEffect } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import MenuItem from '@mui/material/MenuItem'
import { FormSelect, FormTextField } from '../../components/forms'
import type { RoleOption, ShopOption, UnassignedAuthUser } from '../../types/users'
import { onboardUserSchema, type OnboardUserFormValues } from './userSchema'

interface OnboardUserDialogProps {
  open: boolean
  candidates: UnassignedAuthUser[]
  assignableRoles: RoleOption[]
  shops: ShopOption[]
  isSubmitting: boolean
  submitError: string | null
  onSubmit: (values: OnboardUserFormValues) => void
  onClose: () => void
}

export default function OnboardUserDialog({
  open,
  candidates,
  assignableRoles,
  shops,
  isSubmitting,
  submitError,
  onSubmit,
  onClose,
}: OnboardUserDialogProps) {
  const {
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { isSubmitting: formSubmitting },
  } = useForm<OnboardUserFormValues>({
    resolver: zodResolver(onboardUserSchema),
    defaultValues: { user_id: '', full_name: '', phone: '', role: 'cashier', shop_id: '' },
  })

  const role = useWatch({ control, name: 'role' })
  const isSuperAdminRole = role === 'super_admin'

  useEffect(() => {
    if (open) {
      reset({ user_id: '', full_name: '', phone: '', role: 'cashier', shop_id: '' })
    }
  }, [open, reset])

  useEffect(() => {
    if (isSuperAdminRole) {
      setValue('shop_id', '')
    }
  }, [isSuperAdminRole, setValue])

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <Box component="form" noValidate onSubmit={handleSubmit(onSubmit)}>
        <DialogTitle>Onboard User</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          {submitError && <Alert severity="error">{submitError}</Alert>}
          {candidates.length === 0 ? (
            <Alert severity="info">
              No pending sign-ups to onboard. Users who signed up will appear here for role assignment.
            </Alert>
          ) : (
            <FormSelect name="user_id" control={control} label="Account (email)">
              {candidates.map((candidate) => (
                <MenuItem key={candidate.id} value={candidate.id}>
                  {candidate.email}
                </MenuItem>
              ))}
            </FormSelect>
          )}
          <FormTextField name="full_name" control={control} label="Full name" autoComplete="off" />
          <FormTextField name="phone" control={control} label="Phone" autoComplete="off" />
          <FormSelect name="role" control={control} label="Role">
            {assignableRoles.map((roleOption) => (
              <MenuItem key={roleOption.id} value={roleOption.name}>
                {roleOption.name.replace('_', ' ')}
              </MenuItem>
            ))}
          </FormSelect>
          <FormSelect name="shop_id" control={control} label="Shop" disabled={isSuperAdminRole}>
            {isSuperAdminRole ? <MenuItem value="">No shop</MenuItem> : null}
            {shops.map((shop) => (
              <MenuItem key={shop.id} value={shop.id}>
                {shop.name}
              </MenuItem>
            ))}
          </FormSelect>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={onClose} disabled={isSubmitting || formSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={isSubmitting || formSubmitting || candidates.length === 0}
          >
            Onboard User
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  )
}