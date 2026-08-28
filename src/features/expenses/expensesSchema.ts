import { z } from 'zod'

export const createExpenseSchema = z.object({
  shop_id: z.string().min(1, 'Shop is required'),
  description: z
    .string()
    .trim()
    .min(1, 'Description is required')
    .max(255, 'Description must be 255 characters or fewer'),
  amount: z.coerce.number().positive('Amount must be greater than 0').max(99_999_999_999, 'Amount is too large'),
  expense_date: z.string().min(1, 'Date is required'),
})

export type CreateExpenseFormValues = z.infer<typeof createExpenseSchema>