// In Vercel, API routes are on the same domain under /api/
// In development with `vercel dev`, same thing
// No need for a separate API_DOMAIN
export const API_DOMAIN = '';

// Helper to construct full API paths
export const getApiUrl = (path) => `${API_DOMAIN}${path}`;
