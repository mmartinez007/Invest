import supabase from '../lib/supabase.js';
import { verifyToken, unauthorized, cors } from '../lib/auth.js';

export default async function handler(req, res) {
    cors(res);
    if (req.method === 'OPTIONS') return res.status(200).end();

    const decoded = verifyToken(req);
    if (!decoded) return unauthorized(res);

    const id = req.query.id || '';

    try {
        // ===== LIST / CREATE =====
        if (!id) {
            if (req.method === 'GET') {
                const { data } = await supabase.from('portfolios').select('*').eq('user_id', decoded.id).order('created_at', { ascending: true });
                return res.json(data || []);
            }
            if (req.method === 'POST') {
                const { name } = req.body;
                if (!name) return res.status(400).json({ error: 'Portfolio name is required' });

                const { data: user } = await supabase.from('users').select('subscription_tier').eq('id', decoded.id).single();
                const { count } = await supabase.from('portfolios').select('*', { count: 'exact', head: true }).eq('user_id', decoded.id);

                if (user.subscription_tier === 'free' && count >= 1) {
                    return res.status(403).json({ error: 'Free tier limited to 1 portfolio. Upgrade to Pro.', upgrade_required: true });
                }

                const { data: portfolio, error } = await supabase.from('portfolios').insert({ user_id: decoded.id, name }).select().single();
                if (error) throw error;
                return res.status(201).json(portfolio);
            }
        }

        // ===== UPDATE / DELETE by ID =====
        if (id) {
            if (req.method === 'PUT') {
                const { name } = req.body;
                const { data, error } = await supabase.from('portfolios').update({ name }).eq('id', id).eq('user_id', decoded.id).select().single();
                if (error || !data) return res.status(404).json({ error: 'Portfolio not found' });
                return res.json(data);
            }
            if (req.method === 'DELETE') {
                const { data: portfolio } = await supabase.from('portfolios').select('id').eq('id', id).eq('user_id', decoded.id).single();
                if (!portfolio) return res.status(404).json({ error: 'Portfolio not found' });

                const { count } = await supabase.from('portfolios').select('*', { count: 'exact', head: true }).eq('user_id', decoded.id);
                if (count <= 1) return res.status(400).json({ error: 'Cannot delete your only portfolio' });

                await supabase.from('portfolios').delete().eq('id', id);
                return res.json({ success: true });
            }
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (err) {
        console.error('Portfolios error:', err);
        return res.status(500).json({ error: 'Server error' });
    }
}
