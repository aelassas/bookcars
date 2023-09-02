import { Schema, model } from 'mongoose'
import * as env from '../config/env.config'

const pushNotificationSchema = new Schema<env.PushNotification>(
  {
    user: {
      type: Schema.Types.ObjectId,
      required: [true, "can't be blank"],
      ref: 'User',
      index: true,
    },
    token: {
      type: String,
      required: [true, "can't be blank"],
    },
  },
  {
    timestamps: true,
    strict: true,
    collection: 'PushNotification',
  },
)

const pushNotificationModel = model<env.PushNotification>('PushNotification', pushNotificationSchema)

pushNotificationModel.on('index', (err) => {
  if (err) {
    console.error('PushNotification index error: %s', err)
  } else {
    console.info('PushNotification indexing complete')
  }
})

export default pushNotificationModel
