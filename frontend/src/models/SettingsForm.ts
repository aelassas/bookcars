import { z } from 'zod'
import { intervalToDuration } from 'date-fns'
import env from '@/config/env.config'
import { strings as commonStrings } from '@/lang/common'
import { isPakistanPhone } from '@/utils/pakistanValidation'


export const schema = z.object({
  fullName: z.string(),
  email: z.string().email({ message: commonStrings.EMAIL_NOT_VALID }),
  phone: z.string().refine(isPakistanPhone, { message: commonStrings.PHONE_NOT_VALID }),
  birthDate: z.date().refine((value) => {
    const sub = intervalToDuration({ start: value, end: new Date() }).years ?? 0
    return sub >= env.MINIMUM_AGE
  }, { message: commonStrings.BIRTH_DATE_NOT_VALID }),
  location: z.string().optional(),
  bio: z.string().optional(),
  cnicNumber: z.string().refine((value) => !value || /^\d{5}-\d{7}-\d$/.test(value), { message: 'Use CNIC format 12345-1234567-1.' }).optional(),
  drivingLicenseNumber: z.string().max(80).optional(),
})

export type FormFields = z.infer<typeof schema>
