import { z } from 'zod'

export const supplierSchema = z.object({
  _id: z.string(),
  name: z.string(),
  image: z.string().optional(),
})

export type Supplier = z.infer<typeof supplierSchema>

export const optionSchema = z.object({
  _id: z.string(),
  name: z.string(),
  image: z.string().optional(),
})

export type Option = z.infer<typeof optionSchema>
