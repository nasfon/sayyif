import { z } from 'zod'

const optionalEmail = z
  .string()
  .email('Enter a valid email address')
  .or(z.literal(''))

export const createShopSchema = z.object({
  name: z.string().trim().min(1, 'Shop name is required').max(100, 'Shop name must be 100 characters or fewer'),
  phone: z.string().trim().max(30, 'Phone number is too long').optional(),
  email: optionalEmail.optional(),
  address: z.string().trim().max(255, 'Address must be 255 characters or fewer').optional(),
  logo_url: z.string().trim().max(500, 'Logo URL is too long').optional(),
  receipt_footer: z.string().trim().max(255, 'Receipt footer must be 255 characters or fewer').optional(),
})

export const editShopSchema = createShopSchema.extend({
  is_active: z.boolean(),
})

export type CreateShopFormValues = z.infer<typeof createShopSchema>
export type EditShopFormValues = z.infer<typeof editShopSchema>