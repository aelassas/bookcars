import { Schema, model } from 'mongoose'
import * as bookcarsTypes from ':bookcars-types'

const kycSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  documentType: {
    type: String,
    required: true,
    enum: ['cnic', 'passport', 'driving_license'] satisfies bookcarsTypes.KycDocumentType[],
  },
  documentNumber: { type: String, required: true, trim: true, maxlength: 32 },
  documentFront: { type: String },
  documentBack: { type: String },
  selfie: { type: String },
  status: {
    type: String,
    required: true,
    enum: ['pending_review', 'approved', 'rejected', 'suspended'] satisfies bookcarsTypes.KycStatus[],
    default: 'pending_review',
    index: true,
  },
  rejectionReason: { type: String, maxlength: 1000 },
  reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: { type: Date },
}, { timestamps: true, strict: true, collection: 'Kyc' })

kycSchema.index({ user: 1, status: 1 })

export default model('Kyc', kycSchema)
