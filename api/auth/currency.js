import supabase from '../../lib/supabase.js';
import { verifyToken, unauthorized, cors } from '../../lib/auth.js';

export default async function handler(req, res) {
    cors(res);
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'PUT') return res.status(405).json({ error: 'Method not allowed' });

    const decoded = verifyToken(req);
    if (!decoded) return unauthorized(res);

    const { currency } = req.body;
    if (!['USD', 'EUR'].includes(currency)) {
        return res.status(400).json({ error: 'Currency must be USD or EUR' });
    }

    await supabase.from('users').update({ base_currency: currency }).eq('id', decoded.id);
    res.json({ base_currency: currency });
}
