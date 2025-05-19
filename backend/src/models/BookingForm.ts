import { z } from 'zod'
import validator from 'validator'
import { intervalToDuration } from 'date-fns'
import * as bookcarsHelper from ':bookcars-helper'
import env from '@/config/env.config'
import { strings as commonStrings } from '@/lang/common'
import { supplierSchema, optionSchema } from '@/models/common'

export const schema = z.object({
  supplier: supplierSchema.optional(),
  driver: optionSchema.optional(),
  pickupLocation: optionSchema.optional(),
  dropOffLocation: optionSchema.optional(),
  car: optionSchema.optional(),
  from: z.date().optional(),
  to: z.date().optional(),
  status: z.enum(bookcarsHelper.getAllBookingStatuses() as [string, ...string[]]),
  cancellation: z.boolean().default(false).optional(),
  amendments: z.boolean().default(false).optional(),
  theftProtection: z.boolean().default(false).optional(),
  collisionDamageWaiver: z.boolean().default(false).optional(),
  fullInsurance: z.boolean().default(false).optional(),
  additionalDriver: z.boolean().default(false).optional(),
  additionalDriverFullName: z.string().optional(),
  additionalDriverEmail: z.string().email({ message: commonStrings.EMAIL_NOT_VALID }).optional().or(z.literal('')),
  additionalDriverPhone: z.string().refine(val => !val || validator.isMobilePhone(val), {
    message: commonStrings.PHONE_NOT_VALID,
  }).optional(),
  additionalDriverBirthDate: z.date().refine((val) => {
    if (!val) {
      return true // skip validation if no value
    }
    const now = new Date()
    const sub = intervalToDuration({ start: val, end: now }).years ?? 0
    return sub >= env.MINIMUM_AGE
  }).optional(),
})

export type FormFields = z.infer<typeof schema>
