import { cors } from '../../../lib/auth.js';

export default async function handler(req, res) {
    cors(res);
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    const { coinId } = req.query;
    const days = req.query.days || '7';

    try {
        const url = `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=${days}`;
        const response = await fetch(url);
        if (!response.ok) {
            return res.status(response.status).json({ error: 'CoinGecko API error' });
        }

        const data = await response.json();
        res.json({
            prices: (data.prices || []).map(([ts, price]) => ({ t: ts, v: price })),
            volumes: (data.total_volumes || []).map(([ts, vol]) => ({ t: ts, v: vol })),
        });
    } catch (err) {
        console.error('Chart data error:', err.message);
        res.status(500).json({ error: 'Failed to fetch chart data' });
    }
}
