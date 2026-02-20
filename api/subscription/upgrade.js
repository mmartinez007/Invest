import supabase from '../../lib/supabase.js';
import { verifyToken, unauthorized, cors } from '../../lib/auth.js';

const TIERS = {
    free: { max_portfolios: 1, advanced_metrics: false, api_sync: false, alerts: false, tax_export: false, price: 0 },
    pro: { max_portfolios: 999, advanced_metrics: true, api_sync: true, alerts: true, tax_export: true, price: 9.99 },
};

export default async function handler(req, res) {
    cors(res);
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const decoded = verifyToken(req);
    if (!decoded) return unauthorized(res);

    try {
        await supabase.from('users').update({ subscription_tier: 'pro' }).eq('id', decoded.id);
        res.json({
            success: true,
            message: 'Upgraded to Pro! (Demo mode)',
            tier: 'pro',
            features: TIERS.pro,
        });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
}
