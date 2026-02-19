// Production API URL (set via VITE_API_URL env var)
// In development, this is empty to allow the Vite proxy to handle requests to /api
export const API_DOMAIN = import.meta.env.VITE_API_URL || '';

// Helper to construct full API paths
export const getApiUrl = (path) => `${API_DOMAIN}${path}`;

// WebSocket URL
// In production, use the provided VITE_WS_URL or derive from API_URL
// In development, default to localhost:3001
export const getWsUrl = () => {
    if (import.meta.env.VITE_WS_URL) return import.meta.env.VITE_WS_URL;
    if (API_DOMAIN) return API_DOMAIN.replace(/^http/, 'ws');
    return 'ws://localhost:3001';
};
