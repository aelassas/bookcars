import { Schema, model } from 'mongoose'
import * as env from '../config/env.config'

const locationSchema = new Schema<env.Location>(
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
    collection: 'Location',
  },
)

const Location = model<env.Location>('Location', locationSchema)

export default Location
