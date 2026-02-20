import { cors } from '../../lib/auth.js';

export default async function handler(req, res) {
    cors(res);
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    try {
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

        res.json(newsItems);
    } catch (err) {
        console.error('News error:', err.message);
        res.json([]);
    }
}
