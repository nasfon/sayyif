import { type Control, type UseFormHandleSubmit } from 'react-hook-form'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { FormTextField } from '../../components/forms'
import type { BusinessSettingsFormValues } from './settingsSchema'

interface BusinessSettingsFormProps {
  control: Control<BusinessSettingsFormValues>
  handleSubmit: UseFormHandleSubmit<BusinessSettingsFormValues>
  onSubmit: (values: BusinessSettingsFormValues) => void
  isSubmitting: boolean
  submitError: string | null
  onCancel?: () => void
  children?: React.ReactNode
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Box>
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
        {title}
      </Typography>
      <Stack spacing={2}>{children}</Stack>
    </Box>
  )
}

export default function BusinessSettingsForm({
  control,
  handleSubmit,
  onSubmit,
  isSubmitting,
  submitError,
  onCancel,
  children,
}: BusinessSettingsFormProps) {
  return (
    <Box component="form" noValidate onSubmit={handleSubmit(onSubmit)}>
      {submitError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {submitError}
        </Alert>
      )}

      {children}

      <Stack spacing={3} sx={{ mt: 1 }}>
        <Section title="Business Information">
          <FormTextField name="business_name" control={control} label="Business name" autoFocus autoComplete="off" />
        </Section>

        <Section title="Logo">
          <FormTextField name="logo_url" control={control} label="Logo URL" placeholder="https://…" autoComplete="off" />
        </Section>

        <Section title="Contact Information">
          <FormTextField name="phone" control={control} label="Phone" autoComplete="off" />
          <FormTextField name="address" control={control} label="Address" multiline minRows={2} autoComplete="off" />
        </Section>

        <Section title="Receipt Footer">
          <FormTextField
            name="receipt_footer"
            control={control}
            label="Receipt footer"
            multiline
            minRows={2}
            placeholder="Thank you for your patronage!"
            autoComplete="off"
          />
        </Section>
      </Stack>

      <Stack direction="row" spacing={1} sx={{ mt: 3, justifyContent: 'flex-end' }}>
        {onCancel && (
          <Button onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
        )}
        <Button type="submit" variant="contained" disabled={isSubmitting}>
          Save Changes
        </Button>
      </Stack>
    </Box>
  )
}
