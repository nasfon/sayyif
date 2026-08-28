import { z } from 'zod'
import type { CreditPaymentMethod } from '../../types/credit'

export const recordPaymentSchema = (outstanding: number) =>
  z.object({
    amount: z
      .coerce.number()
      .positive('Amount must be greater than 0')
      .max(outstanding, 'Amount cannot exceed the outstanding balance'),
    payment_method: z.enum(['cash', 'card', 'transfer']),
  })

export type RecordPaymentFormValues = z.output<ReturnType<typeof recordPaymentSchema>>
export type RecordPaymentFormInput = z.input<ReturnType<typeof recordPaymentSchema>>

export const CREDIT_PAYMENT_METHOD_OPTIONS: CreditPaymentMethod[] = ['cash', 'card', 'transfer']

export const manualCreditSchema = z.object({
  amount: z.coerce
    .number()
    .positive('Amount must be greater than 0'),
  reason: z
    .string()
    .max(500, 'Reason must be 500 characters or fewer')
    .optional()
    .or(z.literal('')),
})

export type ManualCreditFormValues = z.output<typeof manualCreditSchema>
export type ManualCreditFormInput = z.input<typeof manualCreditSchema>