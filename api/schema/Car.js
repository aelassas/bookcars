import mongoose from 'mongoose';
import Env from '../config/env.config.js';

const Schema = mongoose.Schema;

const carSchema = new Schema({
    company: {
        type: Schema.Types.ObjectId,
        required: [true, "can't be blank"],
        ref: 'User'
    },
    locations: {
        type: [Schema.Types.ObjectId],
        ref: 'Location',
        validate: v => Array.isArray(v) && v.length > 0
    },
    name: {
        type: String,
        required: [true, "can't be blank"],
        index: true
    },
    isAvailable: {
        type: Boolean,
        required: [true, "can't be blank"],
        index: true
    },
    type: {
        type: String,
        enum: [Env.CAR_TYPE.DIESEL, Env.CAR_TYPE.GASOLINE],
        required: [true, "can't be blank"],
    },
    image: {
        type: String
    },
    price: {
        type: Number,
        required: [true, "can't be blank"],
        index: true
    },
    seats: {
        type: Number,
        required: [true, "can't be blank"],
        validate: {
            validator: Number.isInteger,
            message: '{VALUE} is not an integer'
        }
    },
    doors: {
        type: Number,
        required: [true, "can't be blank"],
        validate: {
            validator: Number.isInteger,
            message: '{VALUE} is not an integer'
        }
    },
    aircon: {
        type: Boolean,
        required: [true, "can't be blank"]
    },
    gearbox: {
        type: String,
        enum: [Env.GEARBOX_TYPE.MANUAL, Env.GEARBOX_TYPE.AUTOMATIC],
        required: [true, "can't be blank"],
    },
    mileage: {
        type: Number,
        default: -1
    },
    fuelPolicy: {
        type: String,
        enum: [Env.FUEL_POLICY.LIKE_TO_LIKE, Env.FUEL_POLICY.FREE_TANK],
        required: [true, "can't be blank"],
    },
    cancellation: {
        type: Number,
        default: -1
    },
    amendments: {
        type: Number,
        default: -1
    },
    theftProtection: {
        type: Number,
        default: -1
    },
    collisionDamageWaiver: {
        type: Number,
        default: -1
    },
    fullInsurance: {
        type: Number,
        default: -1
    },
    addionaldriver: {
        type: Number,
        default: -1
    },
}, {
    timestamps: true,
    strict: true,
    collection: 'Car'
});

const carModel = mongoose.model('Car', carSchema);

carModel.on('index', (err) => {
    if (err) {
        console.error('Car index error: %s', err);
    } else {
        console.info('Car indexing complete');
    }
});

export default carModel;