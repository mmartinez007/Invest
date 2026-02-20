import { cors } from '../../lib/auth.js';

export default async function handler(req, res) {
    cors(res);
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const [trendingRes, topRes, globalRes] = await Promise.all([
            fetch('https://api.coingecko.com/api/v3/search/trending'),
            fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=50&page=1&sparkline=true&price_change_percentage=1h%2C24h%2C7d'),
            fetch('https://api.coingecko.com/api/v3/global'),
        ]);

        let trending = [];
        let topCoins = [];
        let globalData = null;

        if (trendingRes.ok) {
            const data = await trendingRes.json();
            trending = (data.coins || []).map(c => ({
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
            topCoins = await topRes.json();
        }

        if (globalRes.ok) {
            const gData = await globalRes.json();
            globalData = gData.data || null;
        }

        res.json({ trending, topCoins, global: globalData });
    } catch (err) {
        console.error('Market fetch error:', err.message);
        res.json({ trending: [], topCoins: [], global: null });
    }
}
