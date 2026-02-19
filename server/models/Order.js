import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
    portfolio: { type: mongoose.Schema.Types.ObjectId, ref: 'Portfolio', required: true },
    coin_id: { type: String, required: true },
    coin_symbol: { type: String, required: true },
    coin_name: { type: String, default: '' },
    type: { type: String, required: true, enum: ['buy', 'sell'] },
    quantity: { type: Number, required: true },
    price_usd: { type: Number, required: true },
    fee_usd: { type: Number, default: 0 },
    date: { type: Date, required: true },
    notes: { type: String, default: '' },
    created_at: { type: Date, default: Date.now }
});

export default mongoose.model('Order', orderSchema);
