import { Router } from 'express';
import { authenticateToken } from './auth.js';
import Watchlist from '../models/Watchlist.js';

const router = Router();

// GET /api/watchlist
router.get('/', authenticateToken, async (req, res) => {
    try {
        const items = await Watchlist.find({ user: req.user.id }).sort({ created_at: -1 });
        res.json(items);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /api/watchlist
router.post('/', authenticateToken, async (req, res) => {
    const { coin_id, coin_symbol, coin_name, coin_thumb } = req.body;
    if (!coin_id || !coin_symbol) {
        return res.status(400).json({ error: 'coin_id and coin_symbol required' });
    }

    try {
        // Check if already in watchlist
        const existing = await Watchlist.findOne({ user: req.user.id, coin_id });
        if (existing) {
            return res.status(400).json({ error: 'Already in watchlist' });
        }

        await Watchlist.create({
            user: req.user.id,
            coin_id,
            coin_symbol,
            coin_name: coin_name || '',
            coin_thumb: coin_thumb || ''
        });

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// DELETE /api/watchlist/:coinId
router.delete('/:coinId', authenticateToken, async (req, res) => {
    try {
        await Watchlist.deleteOne({ user: req.user.id, coin_id: req.params.coinId });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

export default router;
