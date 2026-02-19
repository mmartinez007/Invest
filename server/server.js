import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import authRoutes from './routes/auth.js';
import portfolioRoutes from './routes/portfolios.js';
import orderRoutes from './routes/orders.js';
import analyticsRoutes from './routes/analytics.js';
import priceRoutes, { fetchPrices, priceCache } from './routes/prices.js';
import subscriptionRoutes from './routes/subscription.js';
import marketRoutes from './routes/market.js';
import marketDataRoutes from './routes/marketData.js';
import watchlistRoutes from './routes/watchlist.js';
import connectDB from './db.js';

const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/portfolios', portfolioRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/prices', priceRoutes);
app.use('/api/subscription', subscriptionRoutes);
app.use('/api/market', marketRoutes);
app.use('/api/market', marketDataRoutes);
app.use('/api/watchlist', watchlistRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Global error handler — always return JSON
app.use((err, req, res, next) => {
    console.error('Server error:', err.message || err);
    res.status(err.status || 500).json({
        error: err.message || 'Internal server error'
    });
});

// WebSocket for real-time price streaming
const wss = new WebSocketServer({ server, path: '/ws' });

const wsClients = new Set();

wss.on('connection', (ws) => {
    wsClients.add(ws);
    console.log(`WebSocket client connected. Total: ${wsClients.size}`);

    // Send current cached prices on connect
    if (Object.keys(priceCache.prices).length > 0) {
        ws.send(JSON.stringify({ type: 'prices', data: priceCache.prices, eur_rate: priceCache.eurRate }));
    }

    ws.on('message', (message) => {
        try {
            const msg = JSON.parse(message);
            if (msg.type === 'subscribe' && msg.coins) {
                ws.subscribedCoins = msg.coins;
            }
        } catch {
            // Ignore invalid messages
        }
    });

    ws.on('close', () => {
        wsClients.delete(ws);
    });
});

// Periodic price update & broadcast
async function broadcastPrices() {
    // Collect all unique coin IDs from subscriptions
    const allCoins = new Set();
    for (const ws of wsClients) {
        if (ws.subscribedCoins) {
            ws.subscribedCoins.forEach(c => allCoins.add(c));
        }
    }

    if (allCoins.size > 0) {
        try {
            await fetchPrices([...allCoins]);
            const msg = JSON.stringify({
                type: 'prices',
                data: priceCache.prices,
                eur_rate: priceCache.eurRate,
            });

            for (const ws of wsClients) {
                if (ws.readyState === 1) { // WebSocket.OPEN
                    ws.send(msg);
                }
            }
        } catch (err) {
            console.error('Broadcast error:', err.message);
        }
    }
}

// Broadcast every 30 seconds
setInterval(broadcastPrices, 30000);

// Initialize DB then start server
async function start() {
    await connectDB();
    server.listen(PORT, () => {
        console.log(`
╔══════════════════════════════════════════╗
║     CryptoVault Server v1.0.0           ║
║     Running on port ${PORT}                ║
║     WebSocket: ws://localhost:${PORT}/ws    ║
╚══════════════════════════════════════════╝
    `);
    });
}

start().catch(err => {
    console.error('Failed to start server:', err);
    process.exit(1);
});

export default app;
