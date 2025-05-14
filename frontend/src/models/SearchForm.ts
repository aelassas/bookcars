import { z } from 'zod'
import env from '@/config/env.config'
import { strings } from '@/lang/search-form'

const locationSchema = z.object({
    _id: z.string(),
    country: z.object({
        _id: z.string(),
        name: z.string(),
    }).optional(),
    longitude: z.number().optional(),
    latitude: z.number().optional(),
    name: z.string().optional(),
    image: z.string().optional(),
    parkingSpots: z.array(z.object({
        _id: z.string(),
        name: z.string(),
        longitude: z.number(),
        latitude: z.number(),
    })).optional(),
    supplier: z.object({
        _id: z.string(),
        fullName: z.string(),
    }).optional(),
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
