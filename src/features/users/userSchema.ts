import { z } from 'zod'

export const roleEnum = z.enum(['super_admin', 'shop_admin', 'cashier'])

const shopRequired = (val: { role: string; shop_id: string }, ctx: z.RefinementCtx) => {
  if (val.role !== 'super_admin' && !val.shop_id) {
    ctx.addIssue({
      code: 'custom',
      path: ['shop_id'],
      message: 'Shop is required for this role.',
    })
  }
}

export const createUserSchema = z
  .object({
    full_name: z.string().min(1, 'Full name is required'),
    email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
    phone: z.string().optional(),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    role: roleEnum,
    shop_id: z.string(),
  })
  .superRefine(shopRequired)

export const editUserSchema = z
  .object({
    full_name: z.string().min(1, 'Full name is required'),
    phone: z.string().optional(),
    role: roleEnum,
    shop_id: z.string(),
    is_active: z.boolean(),
  })
  .superRefine(shopRequired)

export const onboardUserSchema = z
  .object({
    user_id: z.string().min(1, 'Select an account'),
    full_name: z.string().min(1, 'Full name is required'),
    phone: z.string().optional(),
    role: roleEnum,
    shop_id: z.string(),
  })
  .superRefine(shopRequired)

export const resetPasswordSchema = z.object({
  new_password: z.string().min(6, 'Password must be at least 6 characters'),
})

export type CreateUserFormValues = z.infer<typeof createUserSchema>
export type EditUserFormValues = z.infer<typeof editUserSchema>
export type OnboardUserFormValues = z.infer<typeof onboardUserSchema>
export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>