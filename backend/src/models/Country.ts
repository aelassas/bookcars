import { Schema, model } from 'mongoose'
import * as env from '../config/env.config'

const countrySchema = new Schema<env.Country>(
  {
    values: {
      type: [Schema.Types.ObjectId],
      ref: 'LocationValue',
      required: [true, "can't be blank"],
      validate: (value: any): boolean => Array.isArray(value),
    },
    supplier: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
    strict: true,
    collection: 'Country',
  },
)

// Add custom indexes
countrySchema.index({ values: 1 })

const Country = model<env.Country>('Country', countrySchema)

export default Country
