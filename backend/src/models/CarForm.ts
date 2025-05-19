import { z } from 'zod'
import * as bookcarsHelper from ':bookcars-helper'
import { strings } from '@/lang/create-car'
import { strings as commonStrings } from '@/lang/common'
import env from '@/config/env.config'
import { supplierSchema, optionSchema } from '@/models/common'

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
  supplier: supplierSchema.optional(),
  minimumAge: z.string()
    .refine(
      (val) => {
        const age = Number.parseInt(val, 10)
        return age >= env.MINIMUM_AGE && age <= 99
      },
      { message: strings.MINIMUM_AGE_NOT_VALID }
    ),
  locations: z.array(optionSchema),
  dailyPrice: z.string()
    .refine((val) => !isNaN(Number(val)), { message: commonStrings.REQUIRED }),
  discountedDailyPrice: z.string().optional(),
  biWeeklyPrice: z.string().optional(),
  discountedBiWeeklyPrice: z.string().optional(),
  weeklyPrice: z.string().optional(),
  discountedWeeklyPrice: z.string().optional(),
  monthlyPrice: z.string().optional(),
  discountedMonthlyPrice: z.string().optional(),
  deposit: z.string()
    .refine((val) => !isNaN(Number(val)), { message: commonStrings.REQUIRED }),
  available: z.boolean(),
  fullyBooked: z.boolean(),
  comingSoon: z.boolean(),
  type: z.string(),
  gearbox: z.string(),
  seats: z.string(),
  doors: z.string(),
  aircon: z.boolean(),
  mileage: z.string().optional(),
  fuelPolicy: z.string(),
  cancellation: z.string().optional(),
  amendments: z.string().optional(),
  theftProtection: z.string().optional(),
  collisionDamageWaiver: z.string().optional(),
  fullInsurance: z.string().optional(),
  additionalDriver: z.string().optional(),
  range: z.string(),
  multimedia: z.array(z.enum([...bookcarsHelper.getAllMultimedias()] as [string, ...string[]])).optional(),
  rating: z.string().optional(),
  co2: z.string().optional(),
  isDateBasedPrice: z.boolean(),
  dateBasedPrices: z.array(dateBasedPriceSchema).optional(),
})

export type FormFields = z.infer<typeof schema>
