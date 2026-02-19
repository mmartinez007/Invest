import mongoose from 'mongoose';

const priceSnapshotSchema = new mongoose.Schema({
    portfolio: { type: mongoose.Schema.Types.ObjectId, ref: 'Portfolio', required: true },
    total_value_usd: { type: Number, required: true },
    snapshot_date: { type: Date, required: true }, // Keeping as Date object, normally stored as ISODate in Mongo
    created_at: { type: Date, default: Date.now }
});

// Compound index to ensure one snapshot per portfolio per day might be useful, 
// but for now we follow the existing logic which just queries by date string compatibility.
// We'll handle the "YYYY-MM-DD" uniqueness logic in the route or via a query.

export default mongoose.model('PriceSnapshot', priceSnapshotSchema);
