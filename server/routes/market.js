import { Router } from 'express';
import fetch from 'node-fetch';

const router = Router();

// Cache
const marketCache = {
    trending: [],
    topCoins: [],
    lastFetch: 0,
    globalData: null,
};

const CACHE_TTL = 120000; // 2 min

// GET /api/market/trending
router.get('/trending', async (req, res) => {
    try {
        const now = Date.now();
        if (now - marketCache.lastFetch < CACHE_TTL && marketCache.trending.length > 0) {
            return res.json({ trending: marketCache.trending, topCoins: marketCache.topCoins, global: marketCache.globalData });
        }

        const [trendingRes, topRes, globalRes] = await Promise.all([
            fetch('https://api.coingecko.com/api/v3/search/trending'),
            fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=50&page=1&sparkline=true&price_change_percentage=1h%2C24h%2C7d'),
            fetch('https://api.coingecko.com/api/v3/global'),
        ]);

        if (trendingRes.ok) {
            const data = await trendingRes.json();
            marketCache.trending = (data.coins || []).map(c => ({
                id: c.item.id,
                name: c.item.name,
                symbol: c.item.symbol,
                thumb: c.item.thumb,
                market_cap_rank: c.item.market_cap_rank,
                price_btc: c.item.price_btc,
                score: c.item.score,
            }));
        }

        if (topRes.ok) {
            marketCache.topCoins = await topRes.json();
        }

        if (globalRes.ok) {
            const gData = await globalRes.json();
            marketCache.globalData = gData.data || null;
        }

        marketCache.lastFetch = now;

        res.json({ trending: marketCache.trending, topCoins: marketCache.topCoins, global: marketCache.globalData });
    } catch (err) {
        console.error('Market fetch error:', err.message);
        res.json({ trending: marketCache.trending, topCoins: marketCache.topCoins, global: marketCache.globalData });
    }
});

export default router;
