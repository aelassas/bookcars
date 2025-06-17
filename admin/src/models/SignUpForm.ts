import { z } from 'zod'
import { strings as commonStrings } from '@/lang/common'
import env from '@/config/env.config'

export const schema = z.object({
  fullName: z.string().min(1),
  email: z.string().email({ message: commonStrings.EMAIL_NOT_VALID }),
  password: z.string().min(env.PASSWORD_MIN_LENGTH, { message: commonStrings.PASSWORD_ERROR }),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  path: ['confirmPassword'],
  message: commonStrings.PASSWORDS_DONT_MATCH,
})

export type FormFields = z.infer<typeof schema>
