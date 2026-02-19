import { Router } from 'express';
import fetch from 'node-fetch';

const router = Router();

// In-memory cache for prices
const priceCache = {
    prices: {},
    lastFetch: 0,
    eurRate: 1,
    eurRateLastFetch: 0,
};

const CACHE_TTL = 60000; // 60 seconds
const COINGECKO_BASE = 'https://api.coingecko.com/api/v3';

// Fetch prices from CoinGecko
async function fetchPrices(coinIds) {
    const now = Date.now();
    const needsFetch = coinIds.some(id => !priceCache.prices[id]) || (now - priceCache.lastFetch > CACHE_TTL);

    if (needsFetch && coinIds.length > 0) {
        try {
            const ids = coinIds.join(',');
            const url = `${COINGECKO_BASE}/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true&include_market_cap=true`;
            const response = await fetch(url);
            if (response.ok) {
                const data = await response.json();
                for (const [id, info] of Object.entries(data)) {
                    priceCache.prices[id] = {
                        usd: info.usd,
                        usd_24h_change: info.usd_24h_change || 0,
                        usd_market_cap: info.usd_market_cap || 0,
                        lastUpdated: now,
                    };
                }
                priceCache.lastFetch = now;
            }
        } catch (err) {
            console.error('Price fetch error:', err.message);
        }
    }

    return priceCache.prices;
}

// Fetch EUR/USD rate
async function fetchEurRate() {
    const now = Date.now();
    if (now - priceCache.eurRateLastFetch > CACHE_TTL * 5) {
        try {
            const url = `${COINGECKO_BASE}/simple/price?ids=tether&vs_currencies=eur`;
            const response = await fetch(url);
            if (response.ok) {
                const data = await response.json();
                if (data.tether && data.tether.eur) {
                    priceCache.eurRate = data.tether.eur;
                    priceCache.eurRateLastFetch = now;
                }
            }
        } catch (err) {
            console.error('EUR rate fetch error:', err.message);
            // Fallback rate
            if (!priceCache.eurRate) priceCache.eurRate = 0.92;
        }
    }
    return priceCache.eurRate;
}

// GET /api/prices?ids=bitcoin,ethereum
router.get('/', async (req, res) => {
    try {
        const ids = req.query.ids ? req.query.ids.split(',') : [];
        if (ids.length === 0) return res.json({});

        const prices = await fetchPrices(ids);
        const eurRate = await fetchEurRate();

        const result = {};
        for (const id of ids) {
            if (prices[id]) {
                result[id] = {
                    ...prices[id],
                    eur: prices[id].usd * eurRate,
                    eur_24h_change: prices[id].usd_24h_change,
                };
            }
        }

        res.json({ prices: result, eur_rate: eurRate });
    } catch (err) {
        console.error('Prices endpoint error:', err);
        res.status(500).json({ error: 'Failed to fetch prices' });
    }
});

// GET /api/prices/search?query=bit
router.get('/search', async (req, res) => {
    try {
        const { query } = req.query;
        if (!query || query.length < 2) return res.json([]);

        const url = `${COINGECKO_BASE}/search?query=${encodeURIComponent(query)}`;
        const response = await fetch(url);
        if (!response.ok) return res.json([]);

        const data = await response.json();
        const coins = (data.coins || []).slice(0, 15).map(c => ({
            id: c.id,
            symbol: c.symbol,
            name: c.name,
            thumb: c.thumb,
            market_cap_rank: c.market_cap_rank,
        }));

        res.json(coins);
    } catch (err) {
        console.error('Search error:', err);
        res.json([]);
    }
});

// GET /api/prices/eur-rate
router.get('/eur-rate', async (req, res) => {
    const rate = await fetchEurRate();
    res.json({ eur_rate: rate });
});

export { fetchPrices, fetchEurRate, priceCache };
export default router;
