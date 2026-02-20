import supabase from '../lib/supabase.js';
import { verifyToken, unauthorized, cors } from '../lib/auth.js';

const TIERS = {
    free: { max_portfolios: 1, advanced_metrics: false, api_sync: false, alerts: false, tax_export: false, price: 0 },
    pro: { max_portfolios: 999, advanced_metrics: true, api_sync: true, alerts: true, tax_export: true, price: 9.99 },
};

export default async function handler(req, res) {
    cors(res);
    if (req.method === 'OPTIONS') return res.status(200).end();

    const decoded = verifyToken(req);
    if (!decoded) return unauthorized(res);

    const action = req.query.action || '';

    try {
        const { data: user } = await supabase.from('users').select('subscription_tier').eq('id', decoded.id).single();
        const tier = user.subscription_tier || 'free';

        // ===== GET INFO =====
        if (req.method === 'GET' && !action) {
            return res.json({ current_tier: tier, features: TIERS[tier], available_tiers: TIERS });
        }

        // ===== UPGRADE =====
        if (action === 'upgrade' && req.method === 'POST') {
            await supabase.from('users').update({ subscription_tier: 'pro' }).eq('id', decoded.id);
            return res.json({ success: true, message: 'Upgraded to Pro! (Demo mode)', tier: 'pro', features: TIERS.pro });
        }

        // ===== DOWNGRADE =====
        if (action === 'downgrade' && req.method === 'POST') {
            await supabase.from('users').update({ subscription_tier: 'free' }).eq('id', decoded.id);
            const { data: portfolios } = await supabase.from('portfolios').select('id').eq('user_id', decoded.id).order('created_at', { ascending: true });
            if (portfolios && portfolios.length > 1) {
                const idsToDelete = portfolios.slice(1).map(p => p.id);
                await supabase.from('portfolios').delete().in('id', idsToDelete);
            }
            return res.json({ success: true, tier: 'free', features: TIERS.free });
        }

        // ===== EXPORT CSV =====
        if (action === 'export' && req.method === 'GET') {
            if (tier !== 'pro') return res.status(403).json({ error: 'Tax export requires Pro subscription', upgrade_required: true });

            const { data: portfolios } = await supabase.from('portfolios').select('id, name').eq('user_id', decoded.id);
            const allOrders = [];
            for (const p of (portfolios || [])) {
                const { data: orders } = await supabase.from('orders').select('*').eq('portfolio_id', p.id).order('date', { ascending: true });
                (orders || []).forEach(o => allOrders.push({ ...o, portfolio_name: p.name }));
            }

            const headers = ['Date', 'Portfolio', 'Type', 'Coin', 'Symbol', 'Quantity', 'Price (USD)', 'Fee (USD)', 'Total (USD)', 'Notes'];
            const rows = allOrders.map(o => [o.date, o.portfolio_name, o.type.toUpperCase(), o.coin_name, o.coin_symbol.toUpperCase(), o.quantity, o.price_usd, o.fee_usd, (o.quantity * o.price_usd).toFixed(2), o.notes || '']);
            const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename=cryptovault_export_${new Date().toISOString().split('T')[0]}.csv`);
            return res.send(csv);
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (err) {
        console.error('Subscription error:', err);
        return res.status(500).json({ error: 'Server error' });
    }
}
