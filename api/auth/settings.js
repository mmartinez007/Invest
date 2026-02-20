import supabase from '../../lib/supabase.js';
import { verifyToken, unauthorized, cors } from '../../lib/auth.js';

export default async function handler(req, res) {
    cors(res);
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'PUT') return res.status(405).json({ error: 'Method not allowed' });

    const decoded = verifyToken(req);
    if (!decoded) return unauthorized(res);

    const { view_mode, gdpr_consent, alerts_enabled } = req.body;
    const updates = {};

    if (view_mode !== undefined) updates.view_mode = view_mode;
    if (gdpr_consent !== undefined) updates.gdpr_consent = gdpr_consent;
    if (alerts_enabled !== undefined) updates.alerts_enabled = alerts_enabled;

    try {
        const { data: settings, error } = await supabase
            .from('user_settings')
            .upsert({ user_id: decoded.id, ...updates }, { onConflict: 'user_id' })
            .select()
            .single();

        if (error) throw error;
        res.json(settings);
    } catch (err) {
        console.error('Settings update error:', err);
        res.status(500).json({ error: 'Server error' });
    }
}
