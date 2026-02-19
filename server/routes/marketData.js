import { Router } from 'express';
import fetch from 'node-fetch';

const router = Router();

// Cache for chart data
const chartCache = {};
const CHART_CACHE_TTL = 300000; // 5 min
// Cache for news
const newsCache = { data: [], lastFetch: 0 };
const NEWS_CACHE_TTL = 600000; // 10 min
// Fear & Greed
const fgiCache = { data: null, lastFetch: 0 };
const FGI_CACHE_TTL = 600000;

// GET /api/market/chart/:coinId?days=7
router.get('/chart/:coinId', async (req, res) => {
    try {
        const { coinId } = req.params;
        const days = req.query.days || '7';
        const cacheKey = `${coinId}_${days}`;
        const now = Date.now();

        if (chartCache[cacheKey] && now - chartCache[cacheKey].ts < CHART_CACHE_TTL) {
            return res.json(chartCache[cacheKey].data);
        }

        const url = `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=${days}`;
        const response = await fetch(url);
        if (!response.ok) {
            return res.status(response.status).json({ error: 'CoinGecko API error' });
        }

        const data = await response.json();
        const result = {
            prices: (data.prices || []).map(([ts, price]) => ({ t: ts, v: price })),
            volumes: (data.total_volumes || []).map(([ts, vol]) => ({ t: ts, v: vol })),
        };

        chartCache[cacheKey] = { data: result, ts: now };

        // Clean old cache entries (max 100)
        const keys = Object.keys(chartCache);
        if (keys.length > 100) {
            const oldest = keys.sort((a, b) => chartCache[a].ts - chartCache[b].ts);
            for (let i = 0; i < keys.length - 50; i++) {
                delete chartCache[oldest[i]];
            }
        }

        res.json(result);
    } catch (err) {
        console.error('Chart data error:', err.message);
        res.status(500).json({ error: 'Failed to fetch chart data' });
    }
});

// GET /api/market/news
router.get('/news', async (req, res) => {
    try {
        const now = Date.now();
        if (now - newsCache.lastFetch < NEWS_CACHE_TTL && newsCache.data.length > 0) {
            return res.json(newsCache.data);
        }

        // Use CoinGecko status updates as a news-like feed
        const [trendingRes, statusRes] = await Promise.all([
            fetch('https://api.coingecko.com/api/v3/search/trending'),
            fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=10&page=1&sparkline=false'),
        ]);

        const newsItems = [];

        if (trendingRes.ok) {
            const trending = await trendingRes.json();
            (trending.coins || []).slice(0, 5).forEach((c, i) => {
                newsItems.push({
                    id: `trending_${c.item.id}`,
                    type: 'trending',
                    title: `${c.item.name} (${c.item.symbol.toUpperCase()}) is trending #${i + 1}`,
                    subtitle: `Market Cap Rank: #${c.item.market_cap_rank || 'N/A'}`,
                    thumb: c.item.thumb,
                    coin_id: c.item.id,
                    timestamp: Date.now(),
                });
            });
        }

        if (statusRes.ok) {
            const topCoins = await statusRes.json();
            topCoins.forEach(coin => {
                const change = coin.price_change_percentage_24h || 0;
                if (Math.abs(change) > 3) {
                    newsItems.push({
                        id: `move_${coin.id}`,
                        type: change > 0 ? 'pump' : 'dump',
                        title: `${coin.name} ${change > 0 ? '📈 surged' : '📉 dropped'} ${Math.abs(change).toFixed(1)}% in 24h`,
                        subtitle: `Current price: $${coin.current_price?.toLocaleString()}`,
                        thumb: coin.image,
                        coin_id: coin.id,
                        timestamp: Date.now(),
                    });
                }
            });
        }

        newsCache.data = newsItems;
        newsCache.lastFetch = now;
        res.json(newsItems);
    } catch (err) {
        console.error('News fetch error:', err.message);
        res.json(newsCache.data || []);
    }
});

// GET /api/market/fgi — Fear & Greed Index
router.get('/fgi', async (req, res) => {
    try {
        const now = Date.now();
        if (fgiCache.data && now - fgiCache.lastFetch < FGI_CACHE_TTL) {
            return res.json(fgiCache.data);
        }

        const response = await fetch('https://api.alternative.me/fng/?limit=1');
        if (response.ok) {
            const data = await response.json();
            if (data.data && data.data[0]) {
                fgiCache.data = {
                    value: parseInt(data.data[0].value),
                    label: data.data[0].value_classification,
                    timestamp: data.data[0].timestamp,
                };
                fgiCache.lastFetch = now;
            }
        }

        res.json(fgiCache.data || { value: 50, label: 'Neutral' });
    } catch (err) {
        console.error('FGI fetch error:', err.message);
        res.json(fgiCache.data || { value: 50, label: 'Neutral' });
    }
});

export default router;
