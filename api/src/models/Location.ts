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

const locationModel = model<env.Location>('Location', locationSchema)

locationModel.on('index', (err) => {
  if (err) {
    console.error('Location index error: %s', err)
  } else {
    console.info('Location indexing complete')
  }
})

export default locationModel
