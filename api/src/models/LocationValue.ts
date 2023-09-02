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

const locationValueModel = model<env.LocationValue>('LocationValue', locationValueSchema)

locationValueModel.on('index', (err) => {
  if (err) {
    console.error('LocationValue index error: %s', err)
  } else {
    console.info('LocationValue indexing complete')
  }
})

export default locationValueModel
