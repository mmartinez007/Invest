import { Router } from 'express';
import { authenticateToken } from './auth.js';
import Order from '../models/Order.js';
import Portfolio from '../models/Portfolio.js';

const router = Router();

// Middleware to verify portfolio ownership
const verifyPortfolio = async (req, res, next) => {
    try {
        const portfolio = await Portfolio.findOne({ _id: req.params.portfolioId, user: req.user.id });
        if (!portfolio) return res.status(404).json({ error: 'Portfolio not found' });
        next();
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
};

// GET /api/orders/:portfolioId
router.get('/:portfolioId', authenticateToken, verifyPortfolio, async (req, res) => {
    try {
        const orders = await Order.find({ portfolio: req.params.portfolioId }).sort({ date: -1 });
        res.json(orders);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /api/orders/:portfolioId
router.post('/:portfolioId', authenticateToken, verifyPortfolio, async (req, res) => {
    const { coin_id, coin_symbol, coin_name, type, quantity, price_usd, fee_usd, date, notes } = req.body;

    if (!coin_id || !coin_symbol || !type || !quantity || !price_usd || !date) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!['buy', 'sell'].includes(type)) {
        return res.status(400).json({ error: 'Type must be buy or sell' });
    }

    try {
        // For sell orders, verify sufficient holdings
        if (type === 'sell') {
            const orders = await Order.find({ portfolio: req.params.portfolioId, coin_id });
            const total = orders.reduce((sum, o) => {
                return sum + (o.type === 'buy' ? o.quantity : -o.quantity);
            }, 0);

            if (total < quantity) {
                return res.status(400).json({ error: `Insufficient holdings. You have ${total} ${coin_symbol.toUpperCase()}` });
            }
        }

        const order = await Order.create({
            portfolio: req.params.portfolioId,
            coin_id,
            coin_symbol,
            coin_name: coin_name || '',
            type,
            quantity,
            price_usd,
            fee_usd: fee_usd || 0,
            date,
            notes: notes || ''
        });

        res.status(201).json(order);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// DELETE /api/orders/:portfolioId/:orderId
router.delete('/:portfolioId/:orderId', authenticateToken, verifyPortfolio, async (req, res) => {
    try {
        const order = await Order.findOneAndDelete({ _id: req.params.orderId, portfolio: req.params.portfolioId });
        if (!order) return res.status(404).json({ error: 'Order not found' });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /api/orders/:portfolioId/holdings — Aggregated holdings
router.get('/:portfolioId/holdings', authenticateToken, verifyPortfolio, async (req, res) => {
    try {
        const orders = await Order.find({ portfolio: req.params.portfolioId });

        // Aggregate in memory
        const holdingsMap = {};

        for (const o of orders) {
            if (!holdingsMap[o.coin_id]) {
                holdingsMap[o.coin_id] = {
                    coin_id: o.coin_id,
                    coin_symbol: o.coin_symbol,
                    coin_name: o.coin_name,
                    quantity: 0,
                    total_cost: 0,
                    total_bought: 0,
                    total_sold_value: 0,
                    total_fees: 0,
                    first_buy_date: o.date
                };
            }

            const h = holdingsMap[o.coin_id];
            h.total_fees += o.fee_usd;

            if (new Date(o.date) < new Date(h.first_buy_date)) {
                h.first_buy_date = o.date;
            }

            if (o.type === 'buy') {
                h.quantity += o.quantity;
                h.total_cost += o.quantity * o.price_usd;
                h.total_bought += o.quantity;
            } else {
                h.quantity -= o.quantity;
                h.total_sold_value += o.quantity * o.price_usd;
            }
        }

        const holdings = Object.values(holdingsMap)
            .filter(h => h.quantity > 0.00000001)
            .map(h => ({
                ...h,
                avg_cost: h.total_bought > 0 ? h.total_cost / h.total_bought : 0
            }))
            .sort((a, b) => b.total_cost - a.total_cost);

        res.json(holdings);
    } catch (err) {
        console.error('Holdings error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

export default router;
