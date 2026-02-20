import supabase from '../../../lib/supabase.js';
import { verifyToken, unauthorized, cors } from '../../../lib/auth.js';

export default async function handler(req, res) {
    cors(res);
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const decoded = verifyToken(req);
    if (!decoded) return unauthorized(res);

    const { portfolioId } = req.query;
    const { total_value_usd } = req.body;
    const today = new Date().toISOString().split('T')[0];

    try {
        // Check existing snapshot for today
        const { data: existing } = await supabase
            .from('price_snapshots')
            .select('id')
            .eq('portfolio_id', portfolioId)
            .eq('snapshot_date', today)
            .single();

        if (existing) {
            await supabase
                .from('price_snapshots')
                .update({ total_value_usd })
                .eq('id', existing.id);
        } else {
            await supabase.from('price_snapshots').insert({
                portfolio_id: portfolioId,
                total_value_usd,
                snapshot_date: today
            });
        }

        res.json({ success: true });
    } catch (err) {
        console.error('Snapshot error:', err);
        res.status(500).json({ error: 'Server error' });
    }
}
