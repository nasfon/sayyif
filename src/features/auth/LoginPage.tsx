import { useEffect, useState, type FormEvent } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import Fingerprint from '@mui/icons-material/Fingerprint'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import Visibility from '@mui/icons-material/Visibility'
import VisibilityOff from '@mui/icons-material/VisibilityOff'
import Logo from '../../components/ui/Logo'
import OfflineBanner from '../../components/feedback/OfflineBanner'
import { getAuthErrorMessage } from '../../lib/errors'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [biometricAvailable, setBiometricAvailable] = useState(false)
  const [isBiometricSubmitting, setIsBiometricSubmitting] = useState(false)
  const [biometricError, setBiometricError] = useState<string | null>(null)
  const { login } = useAuth()

  useEffect(() => {
    const provider = window.PublicKeyCredential
    if (provider && typeof provider.isUserVerifyingPlatformAuthenticatorAvailable === 'function') {
      let active = true
      provider
        .isUserVerifyingPlatformAuthenticatorAvailable()
        .then((available) => {
          if (active) setBiometricAvailable(available)
        })
        .catch(() => {})
      return () => {
        active = false
      }
    }
  }, [])

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextErrors: { email?: string; password?: string } = {}
    if (!email.trim()) {
      nextErrors.email = 'Email is required'
    } else if (!EMAIL_PATTERN.test(email.trim())) {
      nextErrors.email = 'Enter a valid email address'
    }
    if (!password) {
      nextErrors.password = 'Password is required'
    }
    setFieldErrors(nextErrors)
    setErrorMessage(null)
    setBiometricError(null)
    if (Object.keys(nextErrors).length > 0) return

    setIsSubmitting(true)
    try {
      await login(email.trim(), password)
    } catch (error) {
      setErrorMessage(getAuthErrorMessage(error))
      setIsSubmitting(false)
    }
  }

  const handleBiometric = async () => {
    setBiometricError(null)
    setErrorMessage(null)
    setIsBiometricSubmitting(true)
    try {
      const { error } = await supabase.auth.signInWithPasskey()
      if (error) throw error
    } catch (error) {
      setBiometricError(
        getAuthErrorMessage(error) || 'Biometric sign-in is unavailable. Please use your email and password.',
      )
      setIsBiometricSubmitting(false)
    }
  }

  return (
    <Box
      sx={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(160deg, #eff6ff 0%, #ffffff 100%)',
        pt: 'calc(16px + env(safe-area-inset-top))',
        pb: 'calc(16px + env(safe-area-inset-bottom))',
        pl: 'calc(16px + env(safe-area-inset-left))',
        pr: 'calc(16px + env(safe-area-inset-right))',
      }}
    >
      <Box sx={{ width: '100%', maxWidth: 460, mb: 2 }}>
        <OfflineBanner />
      </Box>
      <Card
        sx={{
          width: '100%',
          maxWidth: 420,
          borderRadius: 4,
          boxShadow: '0 20px 50px -20px rgba(37, 99, 235, 0.35)',
        }}
      >
        <CardContent sx={{ p: { xs: 4, sm: 5 } }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 4 }}>
            <Logo />
            <Typography variant="h5" component="h1" sx={{ mt: 2, fontWeight: 700, color: '#1e293b' }}>
              Company
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Sign in to your account
            </Typography>
          </Box>

          <Box
            component="form"
            noValidate
            onSubmit={onSubmit}
            sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
          >
            {errorMessage && <Alert severity="error">{errorMessage}</Alert>}
            <TextField
              label="Email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              fullWidth
              autoComplete="email"
              autoFocus
              sx={{ '& .MuiInputBase-input': { fontSize: 16 } }}
              error={Boolean(fieldErrors.email)}
              helperText={fieldErrors.email}
            />
            <TextField
              label="Password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              fullWidth
              autoComplete="current-password"
              sx={{ '& .MuiInputBase-input': { fontSize: 16 } }}
              error={Boolean(fieldErrors.password)}
              helperText={fieldErrors.password}
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
            <Button
              type="submit"
              variant="contained"
              size="large"
              fullWidth
              disabled={isSubmitting || isBiometricSubmitting}
              sx={{ mt: 1, py: 1.5, fontSize: '0.95rem', fontWeight: 600, textTransform: 'none' }}
            >
              {isSubmitting ? <CircularProgress size={22} color="inherit" /> : 'Login'}
            </Button>

            {biometricAvailable && (
              <>
                <Divider sx={{ my: 0.5 }}>or</Divider>
                {biometricError && <Alert severity="error">{biometricError}</Alert>}
                <Button
                  type="button"
                  variant="outlined"
                  size="large"
                  fullWidth
                  startIcon={isBiometricSubmitting ? <CircularProgress size={18} color="inherit" /> : <Fingerprint />}
                  onClick={handleBiometric}
                  disabled={isSubmitting || isBiometricSubmitting}
                  sx={{ py: 1.5, fontSize: '0.95rem', fontWeight: 600, textTransform: 'none' }}
                >
                  Continue with biometrics
                </Button>
              </>
            )}
          </Box>
        </CardContent>
      </Card>
    </Box>
  )
}