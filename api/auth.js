import bcrypt from 'bcryptjs';
import supabase from '../lib/supabase.js';
import { verifyToken, signToken, unauthorized, cors } from '../lib/auth.js';

export default async function handler(req, res) {
    cors(res);
    if (req.method === 'OPTIONS') return res.status(200).end();

    // Parse action from query: /api/auth?action=login
    const action = req.query.action || '';

    try {
        // ===== REGISTER =====
        if (action === 'register' && req.method === 'POST') {
            const { email, password } = req.body;
            if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
            if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

            const { data: existing } = await supabase.from('users').select('id').eq('email', email).single();
            if (existing) return res.status(409).json({ error: 'Email already registered' });

            const passwordHash = await bcrypt.hash(password, 12);
            const { data: user, error: userErr } = await supabase.from('users').insert({ email, password_hash: passwordHash }).select().single();
            if (userErr) throw userErr;

            await supabase.from('portfolios').insert({ user_id: user.id, name: 'Main Portfolio' });
            await supabase.from('user_settings').insert({ user_id: user.id });

            const token = signToken({ id: user.id, email });
            return res.status(201).json({ token, user: { id: user.id, email, subscription_tier: 'free', base_currency: 'USD' } });
        }

        // ===== LOGIN =====
        if (action === 'login' && req.method === 'POST') {
            const { email, password } = req.body;
            if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

            const { data: user } = await supabase.from('users').select('*').eq('email', email).single();
            if (!user) return res.status(401).json({ error: 'Invalid credentials' });

            const valid = await bcrypt.compare(password, user.password_hash);
            if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

            const token = signToken({ id: user.id, email: user.email });
            return res.json({ token, user: { id: user.id, email: user.email, subscription_tier: user.subscription_tier, base_currency: user.base_currency } });
        }

        // ===== ME =====
        if (action === 'me' && req.method === 'GET') {
            const decoded = verifyToken(req);
            if (!decoded) return unauthorized(res);

            const { data: user } = await supabase.from('users').select('id, email, subscription_tier, base_currency, created_at').eq('id', decoded.id).single();
            if (!user) return res.status(404).json({ error: 'User not found' });

            const { data: settings } = await supabase.from('user_settings').select('*').eq('user_id', decoded.id).single();
            return res.json({ user, settings });
        }

        // ===== CURRENCY =====
        if (action === 'currency' && req.method === 'PUT') {
            const decoded = verifyToken(req);
            if (!decoded) return unauthorized(res);

            const { currency } = req.body;
            if (!['USD', 'EUR'].includes(currency)) return res.status(400).json({ error: 'Currency must be USD or EUR' });

            await supabase.from('users').update({ base_currency: currency }).eq('id', decoded.id);
            return res.json({ base_currency: currency });
        }

        // ===== SETTINGS =====
        if (action === 'settings' && req.method === 'PUT') {
            const decoded = verifyToken(req);
            if (!decoded) return unauthorized(res);

            const { view_mode, gdpr_consent, alerts_enabled } = req.body;
            const updates = {};
            if (view_mode !== undefined) updates.view_mode = view_mode;
            if (gdpr_consent !== undefined) updates.gdpr_consent = gdpr_consent;
            if (alerts_enabled !== undefined) updates.alerts_enabled = alerts_enabled;

            const { data: settings, error } = await supabase.from('user_settings').upsert({ user_id: decoded.id, ...updates }, { onConflict: 'user_id' }).select().single();
            if (error) throw error;
            return res.json(settings);
        }

        return res.status(404).json({ error: 'Unknown auth action' });
    } catch (err) {
        console.error('Auth error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
