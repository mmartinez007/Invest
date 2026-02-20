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
            .select('subscription_tier')
            .eq('id', decoded.id)
            .single();

        if (user.subscription_tier !== 'pro') {
            return res.status(403).json({ error: 'Tax export requires Pro subscription', upgrade_required: true });
        }

        const { data: portfolios } = await supabase
            .from('portfolios')
            .select('id, name')
            .eq('user_id', decoded.id);

        const allOrders = [];
        for (const portfolio of (portfolios || [])) {
            const { data: orders } = await supabase
                .from('orders')
                .select('*')
                .eq('portfolio_id', portfolio.id)
                .order('date', { ascending: true });

            (orders || []).forEach(o => allOrders.push({ ...o, portfolio_name: portfolio.name }));
        }

        const headers = ['Date', 'Portfolio', 'Type', 'Coin', 'Symbol', 'Quantity', 'Price (USD)', 'Fee (USD)', 'Total (USD)', 'Notes'];
        const rows = allOrders.map(o => [
            o.date,
            o.portfolio_name,
            o.type.toUpperCase(),
            o.coin_name,
            o.coin_symbol.toUpperCase(),
            o.quantity,
            o.price_usd,
            o.fee_usd,
            (o.quantity * o.price_usd).toFixed(2),
            o.notes || '',
        ]);

        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=cryptovault_export_${new Date().toISOString().split('T')[0]}.csv`);
        res.send(csv);
    } catch (err) {
        console.error('Export error:', err);
        res.status(500).json({ error: 'Server error' });
    }
}
