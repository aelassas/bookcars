import { Schema, model } from 'mongoose'
import * as env from '../config/env.config'

const locationValueSchema = new Schema<env.LocationValue>(
  {
    language: {
      type: String,
      required: [true, "can't be blank"],
      index: true,
      trim: true,
      lowercase: true,
      minLength: 2,
      maxLength: 2,
    },
    value: {
      type: String,
      required: [true, "can't be blank"],
      index: true,
      trim: true,
    },
  },
  {
    timestamps: true,
    strict: true,
    collection: 'LocationValue',
  },
)

// Add custom indexes
locationValueSchema.index({ language: 1, value: 1 })
locationValueSchema.index(
  { value: 'text' },
  {
    default_language: 'none', // This disables stemming
    language_override: '_none', // Prevent MongoDB from expecting a language field
    background: true,
  },
)

const LocationValue = model<env.LocationValue>('LocationValue', locationValueSchema)

export default LocationValue
