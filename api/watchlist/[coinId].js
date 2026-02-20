import supabase from '../../lib/supabase.js';
import { verifyToken, unauthorized, cors } from '../../lib/auth.js';

export default async function handler(req, res) {
    cors(res);
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'DELETE') return res.status(405).json({ error: 'Method not allowed' });

    const decoded = verifyToken(req);
    if (!decoded) return unauthorized(res);

    const { coinId } = req.query;

    try {
        await supabase
            .from('watchlist')
            .delete()
            .eq('user_id', decoded.id)
            .eq('coin_id', coinId);

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
}
