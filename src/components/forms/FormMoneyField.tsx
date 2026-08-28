import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form'
import TextField, { type TextFieldProps } from '@mui/material/TextField'

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
          type="number"
          inputMode="decimal"
          slotProps={{ htmlInput: { step: 'any', min: 0, inputMode: 'decimal' } }}
          value={field.value ?? ''}
          onChange={(event) => field.onChange(event.target.value)}
          error={!!fieldState.error}
          helperText={fieldState.error?.message}
        />
      )}
    />
  )
}