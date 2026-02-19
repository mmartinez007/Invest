import { Router } from 'express';
import { authenticateToken } from './auth.js';
import Portfolio from '../models/Portfolio.js';
import User from '../models/User.js';

const router = Router();

// GET /api/portfolios
router.get('/', authenticateToken, async (req, res) => {
    try {
        const portfolios = await Portfolio.find({ user: req.user.id }).sort({ created_at: 1 });
        res.json(portfolios);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /api/portfolios
router.post('/', authenticateToken, async (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Portfolio name is required' });

    try {
        // Check subscription limit
        const user = await User.findById(req.user.id);
        const count = await Portfolio.countDocuments({ user: req.user.id });

        if (user.subscription_tier === 'free' && count >= 1) {
            return res.status(403).json({
                error: 'Free tier limited to 1 portfolio. Upgrade to Pro for unlimited portfolios.',
                upgrade_required: true,
            });
        }

        const portfolio = await Portfolio.create({
            user: req.user.id,
            name
        });

        res.status(201).json(portfolio);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// PUT /api/portfolios/:id
router.put('/:id', authenticateToken, async (req, res) => {
    const { name } = req.body;
    try {
        const portfolio = await Portfolio.findOneAndUpdate(
            { _id: req.params.id, user: req.user.id },
            { name },
            { new: true }
        );

        if (!portfolio) return res.status(404).json({ error: 'Portfolio not found' });
        res.json(portfolio);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// DELETE /api/portfolios/:id
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const portfolio = await Portfolio.findOne({ _id: req.params.id, user: req.user.id });
        if (!portfolio) return res.status(404).json({ error: 'Portfolio not found' });

        // Don't allow deleting last portfolio
        const count = await Portfolio.countDocuments({ user: req.user.id });
        if (count <= 1) {
            return res.status(400).json({ error: 'Cannot delete your only portfolio' });
        }

        await Portfolio.deleteOne({ _id: req.params.id });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

export default router;
