import supabase from '../../lib/supabase.js';
import { verifyToken, unauthorized, cors } from '../../lib/auth.js';

export default async function handler(req, res) {
    cors(res);
    if (req.method === 'OPTIONS') return res.status(200).end();

    const decoded = verifyToken(req);
    if (!decoded) return unauthorized(res);

    if (req.method === 'GET') {
        try {
            const { data: items } = await supabase
                .from('watchlist')
                .select('*')
                .eq('user_id', decoded.id)
                .order('created_at', { ascending: false });

            res.json(items || []);
        } catch (err) {
            res.status(500).json({ error: 'Server error' });
        }
    } else if (req.method === 'POST') {
        const { coin_id, coin_symbol, coin_name, coin_thumb } = req.body;
        if (!coin_id || !coin_symbol) {
            return res.status(400).json({ error: 'coin_id and coin_symbol required' });
        }

        try {
            const { data: existing } = await supabase
                .from('watchlist')
                .select('id')
                .eq('user_id', decoded.id)
                .eq('coin_id', coin_id)
                .single();

            if (existing) {
                return res.status(400).json({ error: 'Already in watchlist' });
            }

            await supabase.from('watchlist').insert({
                user_id: decoded.id,
                coin_id,
                coin_symbol,
                coin_name: coin_name || '',
                coin_thumb: coin_thumb || ''
            });

            res.json({ success: true });
        } catch (err) {
            res.status(500).json({ error: 'Server error' });
        }
    } else {
        res.status(405).json({ error: 'Method not allowed' });
    }
}
