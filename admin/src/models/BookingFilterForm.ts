import { z } from 'zod'

export const schema = z.object({
  from: z.date().optional(),
  to: z.date().optional(),
  pickupLocation: z.string().optional(),
  dropOffLocation: z.string().optional(),
  keyword: z.string().optional(),
})

export type FormFields = z.infer<typeof schema>
