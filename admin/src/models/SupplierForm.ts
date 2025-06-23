import { z } from 'zod'
import validator from 'validator'
import { strings as commonStrings } from '@/lang/common'

export const schema = z.object({
    fullName: z.string(),
    email: z.string().email({ message: commonStrings.EMAIL_NOT_VALID }),
    phone: z.string().refine((val) => !val || validator.isMobilePhone(val), { message: commonStrings.PHONE_NOT_VALID }).optional(),
    location: z.string().optional(),
    bio: z.string().optional(),
    blacklisted: z.boolean().optional(),
    payLater: z.boolean().optional(),
    licenseRequired: z.boolean().optional(),
    minimumRentalDays: z.string().refine((val) => !val || /^\d+$/.test(val), { message: commonStrings.FIELD_NOT_VALID }).optional(),
    priceChangeRate: z.string().refine((val) => !val || /^-?\d+(\.\d+)?$/.test(val), { message: commonStrings.FIELD_NOT_VALID }).optional(),
    supplierCarLimit: z.string().refine((val) => !val || /^\d+$/.test(val), { message: commonStrings.FIELD_NOT_VALID }).optional(),
    notifyAdminOnNewCar: z.boolean().optional()
})

export type FormFields = z.infer<typeof schema>
