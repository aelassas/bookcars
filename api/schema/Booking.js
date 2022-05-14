import mongoose from 'mongoose';
import Env from '../config/env.config.js';

const Schema = mongoose.Schema;

const bookingSchema = new Schema({
    company: {
        type: Schema.Types.ObjectId,
        required: [true, "can't be blank"],
        ref: 'Company'
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
        type: Number,
        required: [true, "can't be blank"]
    },
    amendments: {
        type: Number,
        required: [true, "can't be blank"]
    },
    theftProtection: {
        type: Number,
        required: [true, "can't be blank"]
    },
    collisionDamageWaiver: {
        type: Number,
        required: [true, "can't be blank"]
    },
    fullInsurance: {
        type: Number,
        required: [true, "can't be blank"]
    },
    additionalDriver: {
        type: Number,
        required: [true, "can't be blank"]
    },
    price: {
        type: Number,
        required: [true, "can't be blank"]
    }
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