import supabase from '../../lib/supabase.js';
import { verifyToken, unauthorized, cors } from '../../lib/auth.js';

const TIERS = {
    free: { max_portfolios: 1, advanced_metrics: false, api_sync: false, alerts: false, tax_export: false, price: 0 },
    pro: { max_portfolios: 999, advanced_metrics: true, api_sync: true, alerts: true, tax_export: true, price: 9.99 },
};

export default async function handler(req, res) {
    cors(res);
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    const decoded = verifyToken(req);
    if (!decoded) return unauthorized(res);

    try {
        const { data: user } = await supabase
            .from('users')
            .select('subscription_tier')
            .eq('id', decoded.id)
            .single();

        const tier = user.subscription_tier || 'free';
        res.json({ current_tier: tier, features: TIERS[tier], available_tiers: TIERS });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
}
