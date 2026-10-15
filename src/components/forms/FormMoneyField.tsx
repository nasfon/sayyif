import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form'
import TextField, { type TextFieldProps } from '@mui/material/TextField'
import { formatMoneyInput, normalizeMoneyInput } from '../../lib/utils'

interface FormMoneyFieldProps<T extends FieldValues>
  extends Omit<
    TextFieldProps,
    'name' | 'value' | 'onChange' | 'onBlur' | 'error' | 'helperText' | 'type' | 'inputMode'
  > {
  name: Path<T>
  control: Control<T>
}

export default function FormMoneyField<T extends FieldValues>({
  name,
  control,
  ...rest
}: FormMoneyFieldProps<T>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <TextField
          {...field}
          {...rest}
          fullWidth
          sx={{ mb: 1.5, ...rest.sx }}
          type="text"
          inputMode="decimal"
          slotProps={{ htmlInput: { step: 'any', min: 0, inputMode: 'decimal' } }}
          value={formatMoneyInput(field.value ?? '')}
          onChange={(event) => field.onChange(normalizeMoneyInput(event.target.value))}
          error={!!fieldState.error}
          helperText={fieldState.error?.message}
        />
      )}
    />
  )
}