import { z } from 'zod'
import validator from 'validator'
import { strings as commonStrings } from '@/lang/common'

export const schema = z.object({
  fullName: z.string().min(1),
  email: z.string().email({ message: commonStrings.EMAIL_NOT_VALID }),
  phone: z.string().refine((value) => !value || validator.isMobilePhone(value), { message: commonStrings.PHONE_NOT_VALID }).optional(),
  location: z.string().optional(),
  bio: z.string().optional(),
})

export type FormFields = z.infer<typeof schema>
