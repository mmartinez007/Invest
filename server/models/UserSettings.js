import mongoose from 'mongoose';

const userSettingsSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    view_mode: { type: String, default: 'simple' },
    theme: { type: String, default: 'dark' },
    gdpr_consent: { type: Boolean, default: false },
    data_export_requested: { type: Boolean, default: false },
    alerts_enabled: { type: Boolean, default: true }
});

export default mongoose.model('UserSettings', userSettingsSchema);
