import mongoose from 'mongoose';
import Env from '../config/env.config.js';

const Schema = mongoose.Schema;

const bookingSchema = new Schema({
    company: {
        type: Schema.Types.ObjectId,
        required: [true, "can't be blank"],
        ref: 'User'
    },
    car: {
        type: Schema.Types.ObjectId,
        required: [true, "can't be blank"],
        ref: 'Car'
    },
    driver: {
        type: Schema.Types.ObjectId,
        required: [true, "can't be blank"],
        ref: 'User'
    },
    pickupLocation: {
        type: Schema.Types.ObjectId,
        required: [true, "can't be blank"],
        ref: 'Location'
    },
    dropOffLocation: {
        type: Schema.Types.ObjectId,
        required: [true, "can't be blank"],
        ref: 'Location'
    },
    from: {
        type: Date,
        required: [true, "can't be blank"]
    },
    to: {
        type: Date,
        required: [true, "can't be blank"]
    },
    status: {
        type: String,
        enum: [
            Env.BOOKING_STATUS.VOID,
            Env.BOOKING_STATUS.PENDING,
            Env.BOOKING_STATUS.DEPOSIT,
            Env.BOOKING_STATUS.PAID,
            Env.BOOKING_STATUS.RESERVED,
            Env.BOOKING_STATUS.CANCELLED,
        ],
        required: [true, "can't be blank"],
    },
    cancellation: {
        type: Boolean,
        default: false
    },
    amendments: {
        type: Boolean,
        default: false
    },
    theftProtection: {
        type: Boolean,
        default: false
    },
    collisionDamageWaiver: {
        type: Boolean,
        default: false
    },
    fullInsurance: {
        type: Boolean,
        default: false
    },
    additionalDriver: {
        type: Boolean,
        default: false
    },
    _additionalDriver: {
        type: Schema.Types.ObjectId,
        ref: 'AdditionalDriver'
    },
    price: {
        type: Number,
        required: [true, "can't be blank"],
    },
    cancelRequest: {
        type: Boolean,
        default: false
    },
}, {
    timestamps: true,
    strict: true,
    collection: 'Booking'
});

const bookingModel = mongoose.model('Booking', bookingSchema);

bookingModel.on('index', (err) => {
    if (err) {
        console.error('Booking index error: %s', err);
    } else {
        console.info('Booking indexing complete');
    }
});

export default bookingModel;