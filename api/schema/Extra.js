import mongoose from 'mongoose';

const Schema = mongoose.Schema;

const extraSchema = new Schema({
    name: {
        type: String,
        required: [true, "can't be blank"],
        index: true
    }
}, {
    timestamps: true,
    strict: true,
    collection: 'Extra'
});

const extraModel = mongoose.model('Extra', extraSchema);

extraModel.on('index', (err) => {
    if (err) {
        console.error('Extra index error: %s', err);
    } else {
        console.info('Extra indexing complete');
    }
});

export default extraModel;