import supabase from '../lib/supabase.js';
import { verifyToken, unauthorized, cors } from '../lib/auth.js';

export default async function handler(req, res) {
    cors(res);
    if (req.method === 'OPTIONS') return res.status(200).end();

    const decoded = verifyToken(req);
    if (!decoded) return unauthorized(res);

    const portfolioId = req.query.portfolioId || '';
    const action = req.query.action || '';
    const orderId = req.query.orderId || '';

    if (!portfolioId) return res.status(400).json({ error: 'portfolioId required' });

    // Verify portfolio ownership
    const { data: portfolio } = await supabase.from('portfolios').select('id').eq('id', portfolioId).eq('user_id', decoded.id).single();
    if (!portfolio) return res.status(404).json({ error: 'Portfolio not found' });

    try {
        // ===== HOLDINGS =====
        if (action === 'holdings' && req.method === 'GET') {
            const { data: orders } = await supabase.from('orders').select('*').eq('portfolio_id', portfolioId);
            const holdingsMap = {};

            for (const o of (orders || [])) {
                if (!holdingsMap[o.coin_id]) {
                    holdingsMap[o.coin_id] = { coin_id: o.coin_id, coin_symbol: o.coin_symbol, coin_name: o.coin_name, quantity: 0, total_cost: 0, total_bought: 0, total_sold_value: 0, total_fees: 0, first_buy_date: o.date };
                }
                const h = holdingsMap[o.coin_id];
                h.total_fees += o.fee_usd;
                if (new Date(o.date) < new Date(h.first_buy_date)) h.first_buy_date = o.date;

                if (o.type === 'buy') { h.quantity += o.quantity; h.total_cost += o.quantity * o.price_usd; h.total_bought += o.quantity; }
                else { h.quantity -= o.quantity; h.total_sold_value += o.quantity * o.price_usd; }
            }

            const holdings = Object.values(holdingsMap).filter(h => h.quantity > 0.00000001).map(h => ({ ...h, avg_cost: h.total_bought > 0 ? h.total_cost / h.total_bought : 0 })).sort((a, b) => b.total_cost - a.total_cost);
            return res.json(holdings);
        }

        // ===== DELETE ORDER =====
        if (orderId && req.method === 'DELETE') {
            const { data, error } = await supabase.from('orders').delete().eq('id', orderId).eq('portfolio_id', portfolioId).select().single();
            if (error || !data) return res.status(404).json({ error: 'Order not found' });
            return res.json({ success: true });
        }

        // ===== LIST ORDERS =====
        if (req.method === 'GET') {
            const { data: orders } = await supabase.from('orders').select('*').eq('portfolio_id', portfolioId).order('date', { ascending: false });
            return res.json(orders || []);
        }

        // ===== CREATE ORDER =====
        if (req.method === 'POST') {
            const { coin_id, coin_symbol, coin_name, type, quantity, price_usd, fee_usd, date, notes } = req.body;
            if (!coin_id || !coin_symbol || !type || !quantity || !price_usd || !date) return res.status(400).json({ error: 'Missing required fields' });
            if (!['buy', 'sell'].includes(type)) return res.status(400).json({ error: 'Type must be buy or sell' });

            if (type === 'sell') {
                const { data: orders } = await supabase.from('orders').select('type, quantity').eq('portfolio_id', portfolioId).eq('coin_id', coin_id);
                const total = (orders || []).reduce((sum, o) => sum + (o.type === 'buy' ? o.quantity : -o.quantity), 0);
                if (total < quantity) return res.status(400).json({ error: `Insufficient holdings. You have ${total} ${coin_symbol.toUpperCase()}` });
            }

            const { data: order, error } = await supabase.from('orders').insert({ portfolio_id: portfolioId, coin_id, coin_symbol, coin_name: coin_name || '', type, quantity, price_usd, fee_usd: fee_usd || 0, date, notes: notes || '' }).select().single();
            if (error) throw error;
            return res.status(201).json(order);
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (err) {
        console.error('Orders error:', err);
        return res.status(500).json({ error: 'Server error' });
    }
}
