import { z } from 'zod'
import { optionSchema } from '@/models/common'

const locationNameSchema = z.object({
  language: z.string(),
  name: z.string(),
})

const locationValueSchema = z.object({
  language: z.string(),
  value: z.string(),
})

const parkingSpotSchema = z.object({
  latitude: z.string(),
  longitude: z.string(),
  values: z.array(locationValueSchema).optional(),
})

export type ParkingSpot = z.infer<typeof parkingSpotSchema>

export const schema = z.object({
  country: optionSchema.optional(),
  names: z.array(locationNameSchema),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
  image: z.string().optional(),
  parkingSpots: z.array(parkingSpotSchema).optional(),
  parentLocation: optionSchema.optional(),
})

export type FormFields = z.infer<typeof schema>
