import mongoose from 'mongoose';

const portfolioSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    created_at: { type: Date, default: Date.now }
});

export default mongoose.model('Portfolio', portfolioSchema);
