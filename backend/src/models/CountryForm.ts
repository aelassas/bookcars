import { z } from 'zod'
import { strings } from '@/lang/create-country'

const countryNameSchema = z.object({
  language: z.string(),
  name: z.string().min(1, strings.INVALID_COUNTRY)
})


export const schema = z.object({
  names: z.array(countryNameSchema)
})

export type FormFields = z.infer<typeof schema>
