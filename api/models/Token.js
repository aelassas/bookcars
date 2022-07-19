import mongoose from 'mongoose';

const Schema = mongoose.Schema;
const EXPIRE_AT = parseInt(process.env.BC_TOKEN_EXPIRE_AT);

const tokenSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        required: [true, "can't be blank"],
        ref: 'User'
    },
    token: {
        type: String,
        required: [true, "can't be blank"],
    },
    expireAt: {
        type: Date,
        default: Date.now,
        index: { expires: EXPIRE_AT }
    }
}, {
    strict: true,
    collection: 'Token'
});

const tokenModel = mongoose.model('Token', tokenSchema);

tokenModel.on('index', (err) => {
    if (err) {
        console.error('Token index error: %s', err);
    } else {
        console.info('Token indexing complete');
    }
});

export default tokenModel;