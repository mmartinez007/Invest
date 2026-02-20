import bcrypt from 'bcryptjs';
import supabase from '../../lib/supabase.js';
import { signToken, cors } from '../../lib/auth.js';

export default async function handler(req, res) {
    cors(res);
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }
        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }

        // Check if email exists
        const { data: existing } = await supabase
            .from('users')
            .select('id')
            .eq('email', email)
            .single();

        if (existing) {
            return res.status(409).json({ error: 'Email already registered' });
        }

        const passwordHash = await bcrypt.hash(password, 12);

        // Create user
        const { data: user, error: userErr } = await supabase
            .from('users')
            .insert({ email, password_hash: passwordHash })
            .select()
            .single();

        if (userErr) throw userErr;

        // Create default portfolio
        await supabase.from('portfolios').insert({ user_id: user.id, name: 'Main Portfolio' });

        // Create default settings
        await supabase.from('user_settings').insert({ user_id: user.id });

        const token = signToken({ id: user.id, email });

        res.status(201).json({
            token,
            user: { id: user.id, email, subscription_tier: 'free', base_currency: 'USD' },
        });
    } catch (err) {
        console.error('Register error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
}
