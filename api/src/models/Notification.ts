import { Schema, model } from 'mongoose'
import * as env from '../config/env.config'
import * as logger from '../common/logger'

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
    car: {
      type: Schema.Types.ObjectId,
      ref: 'Car',
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

// Add custom indexes
notificationSchema.index({ user: 1, createdAt: -1, _id: 1 })

const Notification = model<env.Notification>('Notification', notificationSchema)

// Create indexes manually and handle potential errors
Notification.syncIndexes().catch((err) => {
  logger.error('Error creating Notification indexes:', err)
})

export default Notification
