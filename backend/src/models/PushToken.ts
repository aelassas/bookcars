import { Schema, model } from 'mongoose'
import * as env from '../config/env.config'

const pushTokenSchema = new Schema<env.PushToken>(
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
    collection: 'PushToken',
  },
)

const PushToken = model<env.PushToken>('PushToken', pushTokenSchema)

export default PushToken
