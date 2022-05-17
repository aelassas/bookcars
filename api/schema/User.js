import validator from 'validator';
import mongoose from 'mongoose';
import Env from '../config/env.config.js';

const Schema = mongoose.Schema;

const userSchema = new Schema({
    company: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    email: {
        type: String,
        lowercase: true,
        unique: true,
        required: [true, "can't be blank"],
        validate: [validator.isEmail, 'is invalid'],
        index: true
    },
    phone: {
        type: String
    },
    fullName: {
        type: String,
        required: [true, "can't be blank"],
        index: true
    },
    password: {
        type: String,
        required: [true, "can't be blank"],
        minlength: 6
    },
    verified: {
        type: Boolean,
        default: false
    },
    verifiedAt: {
        type: Date
    },
    language: { // ISO 639-1 (alpha-2 code)
        type: String,
        default: process.env.BC_DEFAULT_LANGUAGE,
        lowercase: true,
        minlength: 2,
        maxlength: 2
    },
    enableEmailNotifications: {
        type: Boolean,
        default: true
    },
    avatar: {
        type: String
    },
    bio: {
        type: String,
        maxlength: 100
    },
    location: {
        type: String
    },
    type: {
        type: String,
        enum: [Env.USER_TYPE.USER, Env.USER_TYPE.ADMIN, Env.USER_TYPE.COMPANY],
        default: Env.USER_TYPE.USER
    },
    blacklisted: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true,
    strict: true,
    collection: 'User'
});

const userModel = mongoose.model('User', userSchema);

userModel.on('index', (err) => {
    if (err) {
        console.error('User index error: %s', err);
    } else {
        console.info('User indexing complete');
    }
});

export default userModel;