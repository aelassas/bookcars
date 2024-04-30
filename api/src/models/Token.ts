import { Schema, model } from 'mongoose'
import * as env from '../config/env.config'

export const TOKEN_EXPIRE_AT_INDEX_NAME = 'expireAt'

const tokenSchema = new Schema<env.Token>(
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
      index: true,
    },
    expireAt: {
      //
      // Tokens are temporary and are deleted automatically after a certain period of time
      //
      type: Date,
      default: Date.now,
      index: { name: TOKEN_EXPIRE_AT_INDEX_NAME, expireAfterSeconds: env.TOKEN_EXPIRE_AT, background: true },
    },
  },
  {
    timestamps: true,
    strict: true,
    collection: 'Token',
  },
)

const Token = model<env.Token>('Token', tokenSchema)

export default Token
