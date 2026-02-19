import mongoose from 'mongoose';

const watchlistSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    coin_id: { type: String, required: true },
    coin_symbol: { type: String, required: true },
    coin_name: { type: String, default: '' },
    coin_thumb: { type: String, default: '' },
    created_at: { type: Date, default: Date.now }
});

// Ensure a user can't add the same coin twice
watchlistSchema.index({ user: 1, coin_id: 1 }, { unique: true });

export default mongoose.model('Watchlist', watchlistSchema);
