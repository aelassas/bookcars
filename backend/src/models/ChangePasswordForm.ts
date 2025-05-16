import { z } from 'zod'
import { strings as commonStrings } from '@/lang/common'
import env from '@/config/env.config'

export const schema = z.object({
  currentPassword: z.string().min(env.PASSWORD_MIN_LENGTH, { message: commonStrings.PASSWORD_ERROR }).optional(),
  newPassword: z.string().min(env.PASSWORD_MIN_LENGTH, { message: commonStrings.PASSWORD_ERROR }),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  path: ['confirmPassword'],
  message: commonStrings.PASSWORDS_DONT_MATCH
})

export type FormFields = z.infer<typeof schema>
