import mongoose from 'mongoose';

const Schema = mongoose.Schema;

const messageSchema = new Schema({
    from: {
        type: Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    to: {
        type: Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    subject: {
        type: String,
        required: [true, "can't be blank"],
        index: true
    },
    body: {
        type: String,
        required: [true, "can't be blank"],
        index: false
    },
    isRead: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true,
    strict: true,
    collection: 'Message'
});

const messageModel = mongoose.model('Message', messageSchema);

messageModel.on('index', (err) => {
    if (err) {
        console.error('Message index error: %s', err);
    } else {
        console.info('Message indexing complete');
    }
});

export default messageModel;