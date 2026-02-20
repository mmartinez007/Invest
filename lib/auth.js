import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'cryptovault_secret_key_change_in_production';

export function verifyToken(req) {
    const authHeader = req.headers['authorization'] || req.headers['Authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return null;

    try {
        return jwt.verify(token, JWT_SECRET);
    } catch {
        return null;
    }
}

export function signToken(payload) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function unauthorized(res) {
    return res.status(401).json({ error: 'Access token required' });
}

// Helper to set CORS headers
export function cors(res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res;
}
