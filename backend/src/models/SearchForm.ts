import { z } from 'zod'

export const schema = z.object({
  keyword: z.string().optional()
})

export type FormFields = z.infer<typeof schema>
