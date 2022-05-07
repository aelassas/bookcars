import mongoose from 'mongoose';

const Schema = mongoose.Schema;

const messageCounterSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        required: [true, "can't be blank"],
        unique: true,
        ref: 'User'
    },
    count: {
        type: Number,
        default: 0,
        validate: {
            validator: Number.isInteger,
            message: '{VALUE} is not an integer'
        }
    }
}, {
    timestamps: true,
    strict: true,
    collection: 'MessageCounter'
});

const messageCounterModel = mongoose.model('MessageCounter', messageCounterSchema);

messageCounterModel.on('index', (err) => {
    if (err) {
        console.error('MessageCounter index error: %s', err);
    } else {
        console.info('MessageCounter indexing complete');
    }
});

export default messageCounterModel;