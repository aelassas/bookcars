import mongoose from 'mongoose';
import Env from '../config/env.config.js';

const MINIMUM_AGE = parseInt(process.env.BC_MINIMUM_AGE);

const Schema = mongoose.Schema;

const carSchema = new Schema({
    name: {
        type: String,
        required: [true, "can't be blank"],
        index: true,
        trim: true
    },
    company: {
        type: Schema.Types.ObjectId,
        required: [true, "can't be blank"],
        ref: 'User'
    },
    minimumAge: {
        type: Number,
        required: [true, "can't be blank"],
        min: MINIMUM_AGE,
        max: 99
    },
    locations: {
        type: [Schema.Types.ObjectId],
        ref: 'Location',
        validate: (value) => Array.isArray(value) && value.length > 0
    },
    price: {
        type: Number,
        required: [true, "can't be blank"],
    },
    deposit: {
        type: Number,
        required: [true, "can't be blank"],
    },
    available: {
        type: Boolean,
        required: [true, "can't be blank"],
        index: true
    },
    type: {
        type: String,
        enum: [Env.CAR_TYPE.DIESEL, Env.CAR_TYPE.GASOLINE],
        required: [true, "can't be blank"],
    },
    gearbox: {
        type: String,
        enum: [Env.GEARBOX_TYPE.MANUAL, Env.GEARBOX_TYPE.AUTOMATIC],
        required: [true, "can't be blank"],
    },
    aircon: {
        type: Boolean,
        required: [true, "can't be blank"]
    },
    image: {
        type: String
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
    fuelPolicy: {
        type: String,
        enum: [Env.FUEL_POLICY.LIKE_FOR_LIKE, Env.FUEL_POLICY.FREE_TANK],
        required: [true, "can't be blank"],
    },
    mileage: {
        type: Number,
        required: [true, "can't be blank"]
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