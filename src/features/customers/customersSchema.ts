import { z } from 'zod'

const optionalEmail = z
  .string()
  .email('Enter a valid email address')
  .or(z.literal(''))

export const createCustomerSchema = z.object({
  shop_id: z.string().min(1, 'Shop is required'),
  full_name: z
    .string()
    .trim()
    .min(1, 'Customer name is required')
    .max(100, 'Customer name must be 100 characters or fewer'),
  phone: z.string().trim().min(1, 'Phone number is required').max(30, 'Phone number is too long'),
  email: optionalEmail.optional(),
  address: z.string().trim().max(255, 'Address must be 255 characters or fewer').optional(),
})

export const editCustomerSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(1, 'Customer name is required')
    .max(100, 'Customer name must be 100 characters or fewer'),
  phone: z.string().trim().min(1, 'Phone number is required').max(30, 'Phone number is too long'),
  email: optionalEmail.optional(),
  address: z.string().trim().max(255, 'Address must be 255 characters or fewer').optional(),
})

export type CreateCustomerFormValues = z.infer<typeof createCustomerSchema>
export type EditCustomerFormValues = z.infer<typeof editCustomerSchema>