import { Schema, model } from 'mongoose'
import * as env from '../config/env.config'

const notificationCounterSchema = new Schema<env.NotificationCounter>(
  {
    user: {
      type: Schema.Types.ObjectId,
      required: [true, "can't be blank"],
      unique: true,
      ref: 'User',
    },
    count: {
      type: Number,
      default: 0,
      validate: {
        validator: Number.isInteger,
        message: '{VALUE} is not an integer value',
      },
    },
  },
  {
    timestamps: true,
    strict: true,
    collection: 'NotificationCounter',
  },
)

const notificationCounterModel = model<env.NotificationCounter>('NotificationCounter', notificationCounterSchema)

notificationCounterModel.on('index', (err) => {
  if (err) {
    console.error('NotificationCounter index error: %s', err)
  } else {
    console.info('NotificationCounter indexing complete')
  }
})

export default notificationCounterModel
