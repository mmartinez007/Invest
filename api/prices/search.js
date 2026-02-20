import { cors } from '../../lib/auth.js';

const COINGECKO_BASE = 'https://api.coingecko.com/api/v3';

export default async function handler(req, res) {
    cors(res);
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

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
}
