import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Portfolio from '../models/Portfolio.js';
import UserSettings from '../models/UserSettings.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'cryptovault_secret_key_change_in_production';
const JWT_EXPIRY = '7d';

// Middleware: verify JWT token
export function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Access token required' });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch {
        return res.status(403).json({ error: 'Invalid or expired token' });
    }
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }
        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }

        const existing = await User.findOne({ email });
        if (existing) {
            return res.status(409).json({ error: 'Email already registered' });
        }

        const passwordHash = await bcrypt.hash(password, 12);

        const user = await User.create({
            email,
            password_hash: passwordHash
        });

        // Create default portfolio
        await Portfolio.create({
            user: user._id,
            name: 'Main Portfolio'
        });

        // Create default settings
        await UserSettings.create({
            user: user._id
        });

        const token = jwt.sign({ id: user._id, email }, JWT_SECRET, { expiresIn: JWT_EXPIRY });

        res.status(201).json({
            token,
            user: { id: user._id, email, subscription_tier: 'free', base_currency: 'USD' },
        });
    } catch (err) {
        console.error('Register error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, { expiresIn: JWT_EXPIRY });

        res.json({
            token,
            user: {
                id: user._id,
                email: user.email,
                subscription_tier: user.subscription_tier,
                base_currency: user.base_currency,
            },
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/auth/me
router.get('/me', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password_hash');
        if (!user) return res.status(404).json({ error: 'User not found' });

        const settings = await UserSettings.findOne({ user: req.user.id });
        res.json({ user, settings });
    } catch (err) {
        console.error('Me error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// PUT /api/auth/currency
router.put('/currency', authenticateToken, async (req, res) => {
    const { currency } = req.body;
    if (!['USD', 'EUR'].includes(currency)) {
        return res.status(400).json({ error: 'Currency must be USD or EUR' });
    }

    await User.findByIdAndUpdate(req.user.id, { base_currency: currency });
    res.json({ base_currency: currency });
});

// PUT /api/auth/settings
router.put('/settings', authenticateToken, async (req, res) => {
    const { view_mode, gdpr_consent, alerts_enabled } = req.body;
    const updates = {};

    if (view_mode !== undefined) updates.view_mode = view_mode;
    if (gdpr_consent !== undefined) updates.gdpr_consent = gdpr_consent;
    if (alerts_enabled !== undefined) updates.alerts_enabled = alerts_enabled;

    try {
        const settings = await UserSettings.findOneAndUpdate(
            { user: req.user.id },
            { $set: updates },
            { new: true, upsert: true } // Upsert just in case
        );
        res.json(settings);
    } catch (err) {
        console.error('Settings update error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

export default router;
