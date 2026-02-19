import { Router } from 'express';
import { authenticateToken } from './auth.js';
import User from '../models/User.js';
import Portfolio from '../models/Portfolio.js';
import Order from '../models/Order.js';

const router = Router();

// Feature matrix
const TIERS = {
    free: {
        max_portfolios: 1,
        advanced_metrics: false,
        api_sync: false,
        alerts: false,
        tax_export: false,
        price: 0,
    },
    pro: {
        max_portfolios: 999,
        advanced_metrics: true,
        api_sync: true,
        alerts: true,
        tax_export: true,
        price: 9.99,
    },
};

// GET /api/subscription
router.get('/', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        const tier = user.subscription_tier || 'free';
        res.json({
            current_tier: tier,
            features: TIERS[tier],
            available_tiers: TIERS,
        });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /api/subscription/upgrade — Stripe-ready placeholder
router.post('/upgrade', authenticateToken, async (req, res) => {
    try {
        await User.findByIdAndUpdate(req.user.id, { subscription_tier: 'pro' });
        res.json({
            success: true,
            message: 'Upgraded to Pro! (Demo mode — Stripe integration ready)',
            tier: 'pro',
            features: TIERS.pro,
        });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /api/subscription/downgrade
router.post('/downgrade', authenticateToken, async (req, res) => {
    try {
        await User.findByIdAndUpdate(req.user.id, { subscription_tier: 'free' });

        // Delete extra portfolios (keep first one)
        const portfolios = await Portfolio.find({ user: req.user.id }).sort({ created_at: 1 });
        if (portfolios.length > 1) {
            const idsToDelete = portfolios.slice(1).map(p => p._id);
            await Portfolio.deleteMany({ _id: { $in: idsToDelete } });
            // Also delete related orders
            await Order.deleteMany({ portfolio: { $in: idsToDelete } });
        }

        res.json({
            success: true,
            tier: 'free',
            features: TIERS.free,
        });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /api/subscription/webhook — Stripe webhook endpoint (placeholder)
router.post('/webhook', (req, res) => {
    // In production: verify Stripe signature, handle events
    // checkout.session.completed → activate pro
    // customer.subscription.deleted → downgrade to free
    console.log('Stripe webhook received (placeholder)');
    res.json({ received: true });
});

// GET /api/subscription/export — Tax export (Pro only)
router.get('/export', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (user.subscription_tier !== 'pro') {
            return res.status(403).json({ error: 'Tax export requires Pro subscription', upgrade_required: true });
        }

        const portfolios = await Portfolio.find({ user: req.user.id });
        const allOrders = [];

        for (const portfolio of portfolios) {
            const orders = await Order.find({ portfolio: portfolio._id }).sort({ date: 1 });
            orders.forEach(o => allOrders.push({ ...o.toObject(), portfolio_name: portfolio.name }));
        }

        // Generate CSV
        const headers = ['Date', 'Portfolio', 'Type', 'Coin', 'Symbol', 'Quantity', 'Price (USD)', 'Fee (USD)', 'Total (USD)', 'Notes'];
        const rows = allOrders.map(o => [
            o.date.toISOString(),
            o.portfolio_name,
            o.type.toUpperCase(),
            o.coin_name,
            o.coin_symbol.toUpperCase(),
            o.quantity,
            o.price_usd,
            o.fee_usd,
            (o.quantity * o.price_usd).toFixed(2),
            o.notes || '',
        ]);

        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=cryptovault_export_${new Date().toISOString().split('T')[0]}.csv`);
        res.send(csv);
    } catch (err) {
        console.error('Export error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

export default router;
