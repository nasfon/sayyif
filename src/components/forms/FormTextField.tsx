import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form'
import TextField, { type TextFieldProps } from '@mui/material/TextField'

interface FormTextFieldProps<T extends FieldValues>
  extends Omit<TextFieldProps, 'name' | 'value' | 'onChange' | 'onBlur' | 'error' | 'helperText'> {
  name: Path<T>
  control: Control<T>
}

export default function FormTextField<T extends FieldValues>({
  name,
  control,
  ...rest
}: FormTextFieldProps<T>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <TextField
          {...field}
          {...rest}
          fullWidth
          error={!!fieldState.error}
          helperText={fieldState.error?.message}
        />
      )}
    />
  )
}