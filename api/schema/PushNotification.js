import mongoose from 'mongoose';

const Schema = mongoose.Schema;

const pushNotificationSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        required: [true, "can't be blank"],
        ref: 'User',
        index: true
    },
    token: {
        type: String,
        required: [true, "can't be blank"]
    }
}, {
    timestamps: true,
    strict: true,
    collection: 'PushNotification'
});

const pushNotificationModel = mongoose.model('PushNotification', pushNotificationSchema);

pushNotificationModel.on('index', (err) => {
    if (err) {
        console.error('PushNotification index error: %s', err);
    } else {
        console.info('PushNotification indexing complete');
    }
});

export default pushNotificationModel;