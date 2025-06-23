import { z } from 'zod'
import { strings as commonStrings } from '@/lang/common'

export const schema = z.object({
  email: z.string().email({ message: commonStrings.EMAIL_NOT_VALID }),
  subject: z.string(),
  message: z.string(),
})

export type FormFields = z.infer<typeof schema>
