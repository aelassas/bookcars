import { z } from 'zod'

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
})

export type FormFields = z.infer<typeof schema>
