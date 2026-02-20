import { cors } from '../lib/auth.js';

export default async function handler(req, res) {
    cors(res);
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    const action = req.query.action || '';

    try {
        // ===== TRENDING + TOP + GLOBAL =====
        if (action === 'trending') {
            const [trendingRes, topRes, globalRes] = await Promise.all([
                fetch('https://api.coingecko.com/api/v3/search/trending'),
                fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=50&page=1&sparkline=true&price_change_percentage=1h%2C24h%2C7d'),
                fetch('https://api.coingecko.com/api/v3/global'),
            ]);

            let trending = [], topCoins = [], globalData = null;
            if (trendingRes.ok) { const d = await trendingRes.json(); trending = (d.coins || []).map(c => ({ id: c.item.id, name: c.item.name, symbol: c.item.symbol, thumb: c.item.thumb, market_cap_rank: c.item.market_cap_rank, price_btc: c.item.price_btc, score: c.item.score })); }
            if (topRes.ok) topCoins = await topRes.json();
            if (globalRes.ok) { const g = await globalRes.json(); globalData = g.data || null; }

            return res.json({ trending, topCoins, global: globalData });
        }

        // ===== CHART =====
        if (action === 'chart') {
            const coinId = req.query.coinId;
            const days = req.query.days || '7';
            if (!coinId) return res.status(400).json({ error: 'coinId required' });

            const response = await fetch(`https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=${days}`);
            if (!response.ok) return res.status(response.status).json({ error: 'CoinGecko API error' });

            const data = await response.json();
            return res.json({ prices: (data.prices || []).map(([ts, price]) => ({ t: ts, v: price })), volumes: (data.total_volumes || []).map(([ts, vol]) => ({ t: ts, v: vol })) });
        }

        // ===== NEWS =====
        if (action === 'news') {
            const [trendingRes, statusRes] = await Promise.all([
                fetch('https://api.coingecko.com/api/v3/search/trending'),
                fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=10&page=1&sparkline=false'),
            ]);

            const newsItems = [];
            if (trendingRes.ok) { const trending = await trendingRes.json(); (trending.coins || []).slice(0, 5).forEach((c, i) => { newsItems.push({ id: `trending_${c.item.id}`, type: 'trending', title: `${c.item.name} (${c.item.symbol.toUpperCase()}) is trending #${i + 1}`, subtitle: `Market Cap Rank: #${c.item.market_cap_rank || 'N/A'}`, thumb: c.item.thumb, coin_id: c.item.id, timestamp: Date.now() }); }); }
            if (statusRes.ok) { const topCoins = await statusRes.json(); topCoins.forEach(coin => { const change = coin.price_change_percentage_24h || 0; if (Math.abs(change) > 3) newsItems.push({ id: `move_${coin.id}`, type: change > 0 ? 'pump' : 'dump', title: `${coin.name} ${change > 0 ? '📈 surged' : '📉 dropped'} ${Math.abs(change).toFixed(1)}% in 24h`, subtitle: `Current price: $${coin.current_price?.toLocaleString()}`, thumb: coin.image, coin_id: coin.id, timestamp: Date.now() }); }); }
            return res.json(newsItems);
        }

        // ===== FEAR & GREED =====
        if (action === 'fgi') {
            try {
                const response = await fetch('https://api.alternative.me/fng/?limit=1');
                if (response.ok) { const data = await response.json(); if (data.data?.[0]) return res.json({ value: parseInt(data.data[0].value), label: data.data[0].value_classification, timestamp: data.data[0].timestamp }); }
            } catch { /* fallback */ }
            return res.json({ value: 50, label: 'Neutral' });
        }

        return res.status(404).json({ error: 'Unknown market action. Use ?action=trending|chart|news|fgi' });
    } catch (err) {
        console.error('Market error:', err);
        res.status(500).json({ error: 'Server error' });
    }
}
