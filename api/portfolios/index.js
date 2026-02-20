import supabase from '../../lib/supabase.js';
import { verifyToken, unauthorized, cors } from '../../lib/auth.js';

export default async function handler(req, res) {
    cors(res);
    if (req.method === 'OPTIONS') return res.status(200).end();

    const decoded = verifyToken(req);
    if (!decoded) return unauthorized(res);

    if (req.method === 'GET') {
        try {
            const { data: portfolios } = await supabase
                .from('portfolios')
                .select('*')
                .eq('user_id', decoded.id)
                .order('created_at', { ascending: true });

            res.json(portfolios || []);
        } catch (err) {
            res.status(500).json({ error: 'Server error' });
        }
    } else if (req.method === 'POST') {
        const { name } = req.body;
        if (!name) return res.status(400).json({ error: 'Portfolio name is required' });

        try {
            // Check subscription limit
            const { data: user } = await supabase
                .from('users')
                .select('subscription_tier')
                .eq('id', decoded.id)
                .single();

            const { count } = await supabase
                .from('portfolios')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', decoded.id);

            if (user.subscription_tier === 'free' && count >= 1) {
                return res.status(403).json({
                    error: 'Free tier limited to 1 portfolio. Upgrade to Pro for unlimited portfolios.',
                    upgrade_required: true,
                });
            }

            const { data: portfolio, error } = await supabase
                .from('portfolios')
                .insert({ user_id: decoded.id, name })
                .select()
                .single();

            if (error) throw error;
            res.status(201).json(portfolio);
        } catch (err) {
            res.status(500).json({ error: 'Server error' });
        }
    } else {
        res.status(405).json({ error: 'Method not allowed' });
    }
}
