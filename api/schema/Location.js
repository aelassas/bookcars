import mongoose from 'mongoose';

const Schema = mongoose.Schema;

const locationSchema = new Schema({
    name: {
        type: String,
        required: [true, "can't be blank"],
        index: true
    }
}, {
    timestamps: true,
    strict: true,
    collection: 'Location'
});

const locationModel = mongoose.model('Location', locationSchema);

locationModel.on('index', (err) => {
    if (err) {
        console.error('Location index error: %s', err);
    } else {
        console.info('Location indexing complete');
    }
});

export default locationModel;