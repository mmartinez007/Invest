import { cors } from '../../lib/auth.js';

const COINGECKO_BASE = 'https://api.coingecko.com/api/v3';

export default async function handler(req, res) {
    cors(res);
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const ids = req.query.ids ? req.query.ids.split(',') : [];
        if (ids.length === 0) return res.json({});

        const url = `${COINGECKO_BASE}/simple/price?ids=${ids.join(',')}&vs_currencies=usd&include_24hr_change=true&include_market_cap=true`;
        const response = await fetch(url);

        if (!response.ok) return res.json({ prices: {}, eur_rate: 0.92 });

        const data = await response.json();
        const prices = {};
        const now = Date.now();

        for (const [id, info] of Object.entries(data)) {
            prices[id] = {
                usd: info.usd,
                usd_24h_change: info.usd_24h_change || 0,
                usd_market_cap: info.usd_market_cap || 0,
                lastUpdated: now,
            };
        }

        // Fetch EUR rate
        let eurRate = 0.92;
        try {
            const eurRes = await fetch(`${COINGECKO_BASE}/simple/price?ids=tether&vs_currencies=eur`);
            if (eurRes.ok) {
                const eurData = await eurRes.json();
                if (eurData.tether?.eur) eurRate = eurData.tether.eur;
            }
        } catch { /* fallback */ }

        // Add EUR prices
        for (const id of Object.keys(prices)) {
            prices[id].eur = prices[id].usd * eurRate;
            prices[id].eur_24h_change = prices[id].usd_24h_change;
        }

        res.json({ prices, eur_rate: eurRate });
    } catch (err) {
        console.error('Prices error:', err);
        res.status(500).json({ error: 'Failed to fetch prices' });
    }
}
