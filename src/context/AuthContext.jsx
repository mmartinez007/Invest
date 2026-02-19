import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

const API_BASE = '/api';

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('cv_token'));
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (token) {
            fetchUser();
        } else {
            setLoading(false);
        }
    }, []);

    async function fetchUser() {
        try {
            const res = await fetch(`${API_BASE}/auth/me`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                const data = await res.json();
                setUser(data.user);
            } else {
                logout();
            }
        } catch {
            logout();
        } finally {
            setLoading(false);
        }
    }

    async function login(email, password) {
        const res = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        localStorage.setItem('cv_token', data.token);
        setToken(data.token);
        setUser(data.user);
        return data;
    }

    async function register(email, password) {
        const res = await fetch(`${API_BASE}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        localStorage.setItem('cv_token', data.token);
        setToken(data.token);
        setUser(data.user);
        return data;
    }

    function logout() {
        localStorage.removeItem('cv_token');
        setToken(null);
        setUser(null);
    }

    async function updateCurrency(currency) {
        const res = await fetch(`${API_BASE}/auth/currency`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ currency }),
        });
        if (res.ok) {
            setUser(prev => ({ ...prev, base_currency: currency }));
        }
    }

    async function upgradeToPro() {
        const res = await fetch(`${API_BASE}/subscription/upgrade`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
            setUser(prev => ({ ...prev, subscription_tier: 'pro' }));
        }
    }

    const value = {
        user,
        token,
        loading,
        isPro: user?.subscription_tier === 'pro',
        login,
        register,
        logout,
        updateCurrency,
        upgradeToPro,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be inside AuthProvider');
    return ctx;
}
