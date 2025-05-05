import { Schema, model } from 'mongoose'
import * as env from '../config/env.config'
import * as logger from '../common/logger'

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
locationValueSchema.index({ value: 'text' })

const LocationValue = model<env.LocationValue>('LocationValue', locationValueSchema)

// Create indexes manually and handle potential errors
LocationValue.syncIndexes().catch((err) => {
  logger.error('Error creating LocationValue indexes:', err)
})

export default LocationValue
