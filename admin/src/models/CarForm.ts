import { z } from 'zod'
import * as bookcarsHelper from ':bookcars-helper'
import { strings } from '@/lang/create-car'
import { strings as commonStrings } from '@/lang/common'
import env from '@/config/env.config'
import { supplierSchema, optionSchema } from '@/models/common'

const numberRegex = /^\d+(\.\d+)?$/

const dateBasedPriceSchema = z.object({
  _id: z.string().optional(),
  startDate: z.date().nullable(),
  endDate: z.date().nullable(),
  dailyPrice: z.string()
    .refine((val) => !isNaN(Number(val)), { message: commonStrings.REQUIRED }),
})

export type DateBasedPrice = z.infer<typeof dateBasedPriceSchema>

export const schema = z.object({
  name: z.string(),
  licensePlate: z.string().optional(),
  supplier: supplierSchema.optional(),
  minimumAge: z.string()
    .refine((val) => !val || /^\d{2}$/.test(val), { message: commonStrings.FIELD_NOT_VALID })
    .refine(
      (val) => {
        if (!val) {
          return true // if no value is provided, skip the validation
        }
        const age = Number.parseInt(val, 10)
        return age >= env.MINIMUM_AGE && age <= 99
      },
      { message: strings.MINIMUM_AGE_NOT_VALID }
    ),
  locations: z.array(optionSchema),
  dailyPrice: z.string().refine((val) => !val || numberRegex.test(val), { message: commonStrings.FIELD_NOT_VALID }),
  discountedDailyPrice: z.string().refine((val) => !val || numberRegex.test(val), { message: commonStrings.FIELD_NOT_VALID }).optional(),
  hourlyPrice: z.string().refine((val) => !val || numberRegex.test(val), { message: commonStrings.FIELD_NOT_VALID }),
  discountedHourlyPrice: z.string().refine((val) => !val || numberRegex.test(val), { message: commonStrings.FIELD_NOT_VALID }).optional(),
  biWeeklyPrice: z.string().refine((val) => !val || numberRegex.test(val), { message: commonStrings.FIELD_NOT_VALID }).optional(),
  discountedBiWeeklyPrice: z.string().refine((val) => !val || numberRegex.test(val), { message: commonStrings.FIELD_NOT_VALID }).optional(),
  weeklyPrice: z.string().refine((val) => !val || numberRegex.test(val), { message: commonStrings.FIELD_NOT_VALID }).optional(),
  discountedWeeklyPrice: z.string().refine((val) => !val || numberRegex.test(val), { message: commonStrings.FIELD_NOT_VALID }).optional(),
  monthlyPrice: z.string().refine((val) => !val || numberRegex.test(val), { message: commonStrings.FIELD_NOT_VALID }).optional(),
  discountedMonthlyPrice: z.string().refine((val) => !val || numberRegex.test(val), { message: commonStrings.FIELD_NOT_VALID }).optional(),
  deposit: z.string().refine((val) => !val || numberRegex.test(val), { message: commonStrings.FIELD_NOT_VALID }),
  available: z.boolean(),
  fullyBooked: z.boolean(),
  comingSoon: z.boolean(),
  blockOnPay: z.boolean(),
  type: z.string(),
  gearbox: z.string(),
  seats: z.string(),
  doors: z.string(),
  aircon: z.boolean(),
  mileage: z.string().refine((val) => !val || numberRegex.test(val), { message: commonStrings.FIELD_NOT_VALID }).optional(),
  fuelPolicy: z.string(),
  cancellation: z.string().refine((val) => !val || numberRegex.test(val), { message: commonStrings.FIELD_NOT_VALID }).optional(),
  amendments: z.string().refine((val) => !val || numberRegex.test(val), { message: commonStrings.FIELD_NOT_VALID }).optional(),
  theftProtection: z.string().refine((val) => !val || numberRegex.test(val), { message: commonStrings.FIELD_NOT_VALID }).optional(),
  collisionDamageWaiver: z.string().refine((val) => !val || numberRegex.test(val), { message: commonStrings.FIELD_NOT_VALID }).optional(),
  fullInsurance: z.string().refine((val) => !val || numberRegex.test(val), { message: commonStrings.FIELD_NOT_VALID }).optional(),
  additionalDriver: z.string().refine((val) => !val || numberRegex.test(val), { message: commonStrings.FIELD_NOT_VALID }).optional(),
  range: z.string(),
  multimedia: z.array(z.enum([...bookcarsHelper.getAllMultimedias()] as [string, ...string[]])).optional(),
  rating: z.string().optional(),
  co2: z.string().refine((val) => !val || numberRegex.test(val), { message: commonStrings.FIELD_NOT_VALID }).optional(),
  isDateBasedPrice: z.boolean(),
  dateBasedPrices: z.array(dateBasedPriceSchema).optional(),
})

export type FormFields = z.infer<typeof schema>
