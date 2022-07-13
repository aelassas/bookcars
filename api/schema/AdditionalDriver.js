import validator from 'validator';
import mongoose from 'mongoose';

const Schema = mongoose.Schema;

const additionalDriverSchema = new Schema({
    fullName: {
        type: String,
        required: [true, "can't be blank"],
        index: true,
        trim: true
    },
    email: {
        type: String,
        lowercase: true,
        required: [true, "can't be blank"],
        validate: [validator.isEmail, 'is not valid'],
        index: true,
        trim: true
    },
    phone: {
        type: String,
        validate: {
            validator: (value) => {

                // Check if value is empty then return true.
                if (!value) {
                    return true;
                }

                // If value is empty will not validate for mobile phone.
                return validator.isMobilePhone(value);
            },
            message: '{VALUE} is not valid'
        },
        trim: true
    },
    birthDate: {
        type: Date,
        required: [true, "can't be blank"]
    },
}, {
    timestamps: true,
    strict: true,
    collection: 'AdditionalDriver'
});

const additionalDriverModel = mongoose.model('AdditionalDriver', additionalDriverSchema);

additionalDriverModel.on('index', (err) => {
    if (err) {
        console.error('AdditionalDriver index error: %s', err);
    } else {
        console.info('AdditionalDriver indexing complete');
    }
});

export default additionalDriverModel;