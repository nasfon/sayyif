import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form'
import FormControl from '@mui/material/FormControl'
import FormHelperText from '@mui/material/FormHelperText'
import InputLabel from '@mui/material/InputLabel'
import Select, { type SelectProps } from '@mui/material/Select'
import type { ReactNode } from 'react'

interface FormSelectProps<T extends FieldValues>
  extends Omit<SelectProps, 'name' | 'value' | 'onChange' | 'onBlur' | 'error'> {
  name: Path<T>
  control: Control<T>
  label: string
  children: ReactNode
}

export default function FormSelect<T extends FieldValues>({
  name,
  control,
  label,
  children,
  ...rest
}: FormSelectProps<T>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <FormControl fullWidth error={!!fieldState.error}>
          <InputLabel>{label}</InputLabel>
          <Select {...field} {...rest} label={label}>
            {children}
          </Select>
          {fieldState.error?.message && (
            <FormHelperText>{fieldState.error.message}</FormHelperText>
          )}
        </FormControl>
      )}
    />
  )
}