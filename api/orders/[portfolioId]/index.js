import supabase from '../../../lib/supabase.js';
import { verifyToken, unauthorized, cors } from '../../../lib/auth.js';

export default async function handler(req, res) {
    cors(res);
    if (req.method === 'OPTIONS') return res.status(200).end();

    const decoded = verifyToken(req);
    if (!decoded) return unauthorized(res);

    const { portfolioId } = req.query;

    // Verify portfolio ownership
    const { data: portfolio } = await supabase
        .from('portfolios')
        .select('id')
        .eq('id', portfolioId)
        .eq('user_id', decoded.id)
        .single();

    if (!portfolio) return res.status(404).json({ error: 'Portfolio not found' });

    if (req.method === 'GET') {
        try {
            const { data: orders } = await supabase
                .from('orders')
                .select('*')
                .eq('portfolio_id', portfolioId)
                .order('date', { ascending: false });

            res.json(orders || []);
        } catch (err) {
            res.status(500).json({ error: 'Server error' });
        }
    } else if (req.method === 'POST') {
        const { coin_id, coin_symbol, coin_name, type, quantity, price_usd, fee_usd, date, notes } = req.body;

        if (!coin_id || !coin_symbol || !type || !quantity || !price_usd || !date) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        if (!['buy', 'sell'].includes(type)) {
            return res.status(400).json({ error: 'Type must be buy or sell' });
        }

        try {
            // For sell orders, verify sufficient holdings
            if (type === 'sell') {
                const { data: orders } = await supabase
                    .from('orders')
                    .select('type, quantity')
                    .eq('portfolio_id', portfolioId)
                    .eq('coin_id', coin_id);

                const total = (orders || []).reduce((sum, o) => {
                    return sum + (o.type === 'buy' ? o.quantity : -o.quantity);
                }, 0);

                if (total < quantity) {
                    return res.status(400).json({ error: `Insufficient holdings. You have ${total} ${coin_symbol.toUpperCase()}` });
                }
            }

            const { data: order, error } = await supabase
                .from('orders')
                .insert({
                    portfolio_id: portfolioId,
                    coin_id,
                    coin_symbol,
                    coin_name: coin_name || '',
                    type,
                    quantity,
                    price_usd,
                    fee_usd: fee_usd || 0,
                    date,
                    notes: notes || ''
                })
                .select()
                .single();

            if (error) throw error;
            res.status(201).json(order);
        } catch (err) {
            res.status(500).json({ error: 'Server error' });
        }
    } else {
        res.status(405).json({ error: 'Method not allowed' });
    }
}
