import { Schema, model } from 'mongoose'
import * as env from '../config/env.config'

const notificationSchema = new Schema<env.Notification>(
  {
    user: {
      type: Schema.Types.ObjectId,
      required: [true, "can't be blank"],
      ref: 'User',
      index: true,
    },
    message: {
      type: String,
      required: [true, "can't be blank"],
    },
    booking: {
      type: Schema.Types.ObjectId,
      ref: 'Booking',
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    strict: true,
    collection: 'Notification',
  },
)

const notificationModel = model<env.Notification>('Notification', notificationSchema)

notificationModel.on('index', (err) => {
  if (err) {
    console.error('Notification index error: %s', err)
  } else {
    console.info('Notification indexing complete')
  }
})

export default notificationModel
