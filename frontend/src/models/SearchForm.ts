import { z } from 'zod'
import env from '@/config/env.config'
import { strings } from '@/lang/search-form'

const locationValueSchema = z.object({
    _id: z.string(),
    language: z.string(),
    value: z.string(),
})

const parkingSpotSchema = z.object({
    _id: z.string(),
    longitude: z.number(),
    latitude: z.number(),
    name: z.string(),
    values: z.array(locationValueSchema),
})

const countrySchema = z.object({
    _id: z.string(),
    values: z.array(locationValueSchema),
    name: z.string(),
})

const locationSchema = z.object({
    _id: z.string(),
    country: countrySchema,
    values: z.array(locationValueSchema),
    name: z.string(),
    image: z.string().optional(),
    longitude: z.number().optional(),
    latitude: z.number().optional(),
    parkingSpots: z.array(parkingSpotSchema).optional(),
})

export type LocationField = z.infer<typeof locationSchema>

export const schema = z.object({
    from: z.date().nullable(),
    to: z.date().nullable(),
    pickupLocation: locationSchema.nullable(),
    dropOffLocation: locationSchema.nullable(),
    sameLocation: z.boolean()
}).superRefine((data, ctx) => {
    const { from, to } = data

    const minPickupDuration = env.MIN_PICK_UP_HOURS * 60 * 60 * 1000
    const minRentalDuration = env.MIN_RENTAL_HOURS * 60 * 60 * 1000

    if (from) {
        const minPickupTime = from.getTime() - Date.now()

        if (minPickupTime < minPickupDuration) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['from'],
                message: strings.MIN_PICK_UP_HOURS_ERROR,
            })
        }
    }

    if (from && to) {
        const rentalDuration = to.getTime() - from.getTime()

        if (rentalDuration < minRentalDuration) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['to'],
                message: strings.MIN_RENTAL_HOURS_ERROR,
            })
        }
    }
})

export type FormFields = z.infer<typeof schema>
