import supabase from '../../lib/supabase.js';
import { verifyToken, unauthorized, cors } from '../../lib/auth.js';

export default async function handler(req, res) {
    cors(res);
    if (req.method === 'OPTIONS') return res.status(200).end();

    const decoded = verifyToken(req);
    if (!decoded) return unauthorized(res);

    const { id } = req.query;

    if (req.method === 'PUT') {
        const { name } = req.body;
        try {
            const { data: portfolio, error } = await supabase
                .from('portfolios')
                .update({ name })
                .eq('id', id)
                .eq('user_id', decoded.id)
                .select()
                .single();

            if (error || !portfolio) return res.status(404).json({ error: 'Portfolio not found' });
            res.json(portfolio);
        } catch (err) {
            res.status(500).json({ error: 'Server error' });
        }
    } else if (req.method === 'DELETE') {
        try {
            // Verify ownership
            const { data: portfolio } = await supabase
                .from('portfolios')
                .select('id')
                .eq('id', id)
                .eq('user_id', decoded.id)
                .single();

            if (!portfolio) return res.status(404).json({ error: 'Portfolio not found' });

            // Don't allow deleting last portfolio
            const { count } = await supabase
                .from('portfolios')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', decoded.id);

            if (count <= 1) {
                return res.status(400).json({ error: 'Cannot delete your only portfolio' });
            }

            await supabase.from('portfolios').delete().eq('id', id);
            res.json({ success: true });
        } catch (err) {
            res.status(500).json({ error: 'Server error' });
        }
    } else {
        res.status(405).json({ error: 'Method not allowed' });
    }
}
