import mongoose from 'mongoose';

const Schema = mongoose.Schema;

const bookingSchema = new Schema({
    
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