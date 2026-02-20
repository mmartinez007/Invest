import supabase from '../../lib/supabase.js';
import { verifyToken, unauthorized, cors } from '../../lib/auth.js';

export default async function handler(req, res) {
    cors(res);
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    const decoded = verifyToken(req);
    if (!decoded) return unauthorized(res);

    try {
        const { data: user } = await supabase
            .from('users')
            .select('id, email, subscription_tier, base_currency, created_at')
            .eq('id', decoded.id)
            .single();

        if (!user) return res.status(404).json({ error: 'User not found' });

        const { data: settings } = await supabase
            .from('user_settings')
            .select('*')
            .eq('user_id', decoded.id)
            .single();

        res.json({ user, settings });
    } catch (err) {
        console.error('Me error:', err);
        res.status(500).json({ error: 'Server error' });
    }
}
