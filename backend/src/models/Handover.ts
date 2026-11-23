import { Schema, model } from 'mongoose'

const handoverSchema = new Schema({
  booking: { type: Schema.Types.ObjectId, ref: 'Booking', required: true, index: true },
  vehicle: { type: Schema.Types.ObjectId, ref: 'Car', required: true, index: true },
  customer: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  supplier: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  status: {
    type: String,
    required: true,
    enum: ['scheduled', 'in_progress', 'completed', 'cancelled'],
    default: 'scheduled',
  },
  odometerAtPickup: { type: Number, min: 0 },
  odometerAtReturn: { type: Number, min: 0 },
  fuelLevelAtPickup: { type: Number, min: 0, max: 100 },
  fuelLevelAtReturn: { type: Number, min: 0, max: 100 },
  checklistAtPickup: { type: Schema.Types.Mixed, default: {} },
  checklistAtReturn: { type: Schema.Types.Mixed, default: {} },
  pickupPhotos: [{ type: String }],
  returnPhotos: [{ type: String }],
  customerSignature: { type: String },
  supplierSignature: { type: String },
  damageNotes: { type: String, maxlength: 2000 },
  scheduledAt: { type: Date },
  completedAt: { type: Date },
}, { timestamps: true, strict: true, collection: 'Handover' })

handoverSchema.index({ booking: 1, status: 1 })

export default model('Handover', handoverSchema)
