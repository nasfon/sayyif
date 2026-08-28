import { useEffect, useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import FormControlLabel from '@mui/material/FormControlLabel'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import Switch from '@mui/material/Switch'
import Visibility from '@mui/icons-material/Visibility'
import VisibilityOff from '@mui/icons-material/VisibilityOff'
import { BottomSheet } from '../../../components/mobile'
import { FormSelect, FormTextField } from '../../../components/forms'
import type { RoleOption, ShopOption, UserRecord } from '../../../types/users'
import {
  createUserSchema,
  editUserSchema,
  type CreateUserFormValues,
  type EditUserFormValues,
} from '../userSchema'

type UserFormInput = CreateUserFormValues | EditUserFormValues

interface MobileUserFormSheetProps {
  open: boolean
  mode: 'create' | 'edit'
  user?: UserRecord
  assignableRoles: RoleOption[]
  shops: ShopOption[]
  isSubmitting: boolean
  submitError: string | null
  onSubmit: (values: CreateUserFormValues | EditUserFormValues) => void
  onClose: () => void
}

export default function MobileUserFormSheet({
  open,
  mode,
  user,
  assignableRoles,
  shops,
  isSubmitting,
  submitError,
  onSubmit,
  onClose,
}: MobileUserFormSheetProps) {
  const [showPassword, setShowPassword] = useState(false)
  const isCreate = mode === 'create'

  const createDefaults: CreateUserFormValues = {
    full_name: '',
    email: '',
    phone: '',
    password: '',
    role: 'cashier',
    shop_id: '',
  }
  const editDefaults: EditUserFormValues = {
    full_name: user?.full_name ?? '',
    phone: user?.phone ?? '',
    role: user?.role ?? 'cashier',
    shop_id: user?.shop_id ?? '',
    is_active: user?.is_active ?? true,
  }

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { isSubmitting: formSubmitting },
  } = useForm<UserFormInput>({
    resolver: zodResolver(isCreate ? createUserSchema : editUserSchema),
    defaultValues: isCreate ? createDefaults : (editDefaults as UserFormInput),
  })

  const role = useWatch({ control, name: 'role' })

  useEffect(() => {
    if (open) {
      reset(isCreate ? createDefaults : (editDefaults as UserFormInput))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode, user, reset])

  useEffect(() => {
    if (role === 'super_admin') {
      setValue('shop_id', '')
    }
  }, [role, setValue])

  const isSuperAdminRole = role === 'super_admin'

  return (
    <BottomSheet open={open} onClose={onClose} title={isCreate ? 'Add User' : 'Edit User'}>
      <Box component="form" noValidate onSubmit={handleSubmit(onSubmit)}>
        {submitError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {submitError}
          </Alert>
        )}
        <FormTextField name="full_name" control={control} label="Full name" autoFocus autoComplete="off" />
        <FormTextField name="phone" control={control} label="Phone" autoComplete="off" />
        {isCreate && (
          <>
            <FormTextField name="email" control={control} label="Email" type="email" autoComplete="off" />
            <FormTextField
              name="password"
              control={control}
              label="Temporary password"
              type={showPassword ? 'text' : 'password'}
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        onClick={() => setShowPassword((v) => !v)}
                        edge="end"
                        size="small"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />
          </>
        )}
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
        {!isCreate && (
          <Controller
            name="is_active"
            control={control}
            render={({ field }) => (
              <FormControlLabel
                control={<Switch checked={field.value} onChange={field.onChange} />}
                label="Active"
                sx={{ mt: 1 }}
              />
            )}
          />
        )}
        <Stack direction="row" spacing={1.5} sx={{ mt: 2.5 }}>
          <Button onClick={onClose} disabled={isSubmitting || formSubmitting} fullWidth>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={isSubmitting || formSubmitting} fullWidth>
            {isCreate ? 'Create' : 'Save'}
          </Button>
        </Stack>
      </Box>
    </BottomSheet>
  )
}
