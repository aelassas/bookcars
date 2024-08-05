import { Schema, model } from 'mongoose'
import * as env from '../config/env.config'

const countrySchema = new Schema<env.Country>(
  {
    values: {
      type: [Schema.Types.ObjectId],
      ref: 'LocationValue',
      validate: (value: any): boolean => Array.isArray(value) && value.length > 1,
    },
  },
  {
    timestamps: true,
    strict: true,
    collection: 'Country',
  },
)

const Country = model<env.Country>('Country', countrySchema)

export default Country
