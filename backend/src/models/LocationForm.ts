import { z } from 'zod'

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
  country: z.string(),
  names: z.array(locationNameSchema),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
  image: z.string().optional(),
  parkingSpots: z.array(parkingSpotSchema).optional(),
})

export type FormFields = z.infer<typeof schema>
