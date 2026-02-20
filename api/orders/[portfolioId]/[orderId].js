import supabase from '../../../lib/supabase.js';
import { verifyToken, unauthorized, cors } from '../../../lib/auth.js';

export default async function handler(req, res) {
    cors(res);
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'DELETE') return res.status(405).json({ error: 'Method not allowed' });

    const decoded = verifyToken(req);
    if (!decoded) return unauthorized(res);

    const { portfolioId, orderId } = req.query;

    // Verify portfolio ownership
    const { data: portfolio } = await supabase
        .from('portfolios')
        .select('id')
        .eq('id', portfolioId)
        .eq('user_id', decoded.id)
        .single();

    if (!portfolio) return res.status(404).json({ error: 'Portfolio not found' });

    try {
        const { data, error } = await supabase
            .from('orders')
            .delete()
            .eq('id', orderId)
            .eq('portfolio_id', portfolioId)
            .select()
            .single();

        if (error || !data) return res.status(404).json({ error: 'Order not found' });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
}
