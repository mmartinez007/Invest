import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password_hash: { type: String, required: true },
    subscription_tier: { type: String, default: 'free' },
    base_currency: { type: String, default: 'USD' },
    created_at: { type: Date, default: Date.now }
});

export default mongoose.model('User', userSchema);
