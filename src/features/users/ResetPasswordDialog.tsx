import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import Typography from '@mui/material/Typography'
import Visibility from '@mui/icons-material/Visibility'
import VisibilityOff from '@mui/icons-material/VisibilityOff'
import { FormTextField } from '../../components/forms'
import { resetPasswordSchema, type ResetPasswordFormValues } from './userSchema'

interface ResetPasswordDialogProps {
  open: boolean
  userName: string
  isSubmitting: boolean
  submitError: string | null
  onSubmit: (values: ResetPasswordFormValues) => void
  onClose: () => void
}

export default function ResetPasswordDialog({
  open,
  userName,
  isSubmitting,
  submitError,
  onSubmit,
  onClose,
}: ResetPasswordDialogProps) {
  const [showPassword, setShowPassword] = useState(false)

  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting: formSubmitting },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { new_password: '' },
  })

  useEffect(() => {
    if (open) {
      reset({ new_password: '' })
    }
  }, [open, reset])

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <Box component="form" noValidate onSubmit={handleSubmit(onSubmit)}>
        <DialogTitle>Reset Password</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Set a new password for {userName}.
          </Typography>
          {submitError && <Alert severity="error">{submitError}</Alert>}
          <FormTextField
            name="new_password"
            control={control}
            label="New password"
            type={showPassword ? 'text' : 'password'}
            autoFocus
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
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={onClose} disabled={isSubmitting || formSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={isSubmitting || formSubmitting}>
            Reset Password
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  )
}