import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { API_DOMAIN } from '../config';

const CurrencyContext = createContext(null);

export function CurrencyProvider({ children }) {
    const { user, token } = useAuth();
    const [currency, setCurrency] = useState(user?.base_currency || 'USD');
    const [eurRate, setEurRate] = useState(0.92); // fallback
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (user?.base_currency) setCurrency(user.base_currency);
    }, [user?.base_currency]);

    // Fetch live EUR/USD rate
    useEffect(() => {
        fetchEurRate();
        const interval = setInterval(fetchEurRate, 300000); // every 5 min
        return () => clearInterval(interval);
    }, []);

    async function fetchEurRate() {
        try {
            const res = await fetch(`${API_DOMAIN}/api/prices?action=eur-rate`);
            if (res.ok) {
                const data = await res.json();
                setEurRate(data.eur_rate);
            }
        } catch {
            // use fallback
        }
    }

    const convert = useCallback((usdValue) => {
        if (currency === 'EUR') return usdValue * eurRate;
        return usdValue;
    }, [currency, eurRate]);

    const symbol = currency === 'EUR' ? '€' : '$';

    const formatValue = useCallback((usdValue, decimals = 2) => {
        const converted = convert(usdValue);
        const formatted = Math.abs(converted) >= 1
            ? converted.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
            : converted.toFixed(Math.max(decimals, 4));
        return `${symbol}${formatted}`;
    }, [convert, symbol]);

    const toggleCurrency = async () => {
        const next = currency === 'USD' ? 'EUR' : 'USD';
        setCurrency(next);
        if (token) {
            try {
                await fetch(`${API_DOMAIN}/api/auth?action=currency`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                    body: JSON.stringify({ currency: next }),
                });
            } catch {
                // silent fail, local state already updated
            }
        }
    };

    const value = { currency, eurRate, convert, symbol, formatValue, toggleCurrency, setCurrency };

    return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency() {
    const ctx = useContext(CurrencyContext);
    if (!ctx) throw new Error('useCurrency must be inside CurrencyProvider');
    return ctx;
}
