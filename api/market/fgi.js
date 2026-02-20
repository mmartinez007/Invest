import { cors } from '../../lib/auth.js';

export default async function handler(req, res) {
    cors(res);
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const response = await fetch('https://api.alternative.me/fng/?limit=1');
        if (response.ok) {
            const data = await response.json();
            if (data.data && data.data[0]) {
                return res.json({
                    value: parseInt(data.data[0].value),
                    label: data.data[0].value_classification,
                    timestamp: data.data[0].timestamp,
                });
            }
        }
        res.json({ value: 50, label: 'Neutral' });
    } catch {
        res.json({ value: 50, label: 'Neutral' });
    }
}
