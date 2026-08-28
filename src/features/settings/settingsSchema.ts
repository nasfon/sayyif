import { z } from 'zod'

export const businessSettingsSchema = z.object({
  business_name: z
    .string()
    .trim()
    .min(1, 'Business name is required')
    .max(120, 'Business name is too long'),
  phone: z
    .string()
    .trim()
    .max(40, 'Phone is too long')
    .optional()
    .or(z.literal('')),
  address: z
    .string()
    .trim()
    .max(240, 'Address is too long')
    .optional()
    .or(z.literal('')),
  logo_url: z
    .string()
    .trim()
    .max(500, 'Logo URL is too long')
    .url('Enter a valid URL')
    .optional()
    .or(z.literal('')),
  receipt_footer: z
    .string()
    .trim()
    .max(280, 'Receipt footer is too long')
    .optional()
    .or(z.literal('')),
})

export type BusinessSettingsFormValues = z.infer<typeof businessSettingsSchema>
