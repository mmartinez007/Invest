import { cors } from '../../lib/auth.js';

export default async function handler(req, res) {
    cors(res);
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const eurRes = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=eur');
        if (eurRes.ok) {
            const data = await eurRes.json();
            if (data.tether?.eur) {
                return res.json({ eur_rate: data.tether.eur });
            }
        }
        res.json({ eur_rate: 0.92 });
    } catch {
        res.json({ eur_rate: 0.92 });
    }
}
