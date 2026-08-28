import { z } from 'zod'

export const REASON_MIN_LENGTH = 5

export const reasonSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(REASON_MIN_LENGTH, `Reason must be at least ${REASON_MIN_LENGTH} characters.`),
})

export type ReasonFormInput = z.input<typeof reasonSchema>
export type ReasonFormValues = z.output<typeof reasonSchema>
