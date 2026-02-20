import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { API_DOMAIN } from '../config';

const PriceContext = createContext(null);

const POLL_INTERVAL = 30000; // 30 seconds

export function PriceProvider({ children }) {
    const [prices, setPrices] = useState({});
    const [eurRate, setEurRate] = useState(0.92);
    const [connected, setConnected] = useState(true);
    const subscribedCoinsRef = useRef([]);
    const intervalRef = useRef(null);

    // Fetch prices via REST
    const fetchPricesFromApi = useCallback(async (coinIds) => {
        if (!coinIds || coinIds.length === 0) return;
        try {
            const res = await fetch(`${API_DOMAIN}/api/prices?ids=${coinIds.join(',')}`);
            if (res.ok) {
                const data = await res.json();
                if (data.prices) setPrices(prev => ({ ...prev, ...data.prices }));
                if (data.eur_rate) setEurRate(data.eur_rate);
                setConnected(true);
            }
        } catch {
            setConnected(false);
        }
    }, []);

    // Start polling when coins are subscribed
    useEffect(() => {
        if (subscribedCoinsRef.current.length > 0) {
            fetchPricesFromApi(subscribedCoinsRef.current);
        }

        intervalRef.current = setInterval(() => {
            if (subscribedCoinsRef.current.length > 0) {
                fetchPricesFromApi(subscribedCoinsRef.current);
            }
        }, POLL_INTERVAL);

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [fetchPricesFromApi]);

    const subscribe = useCallback((coinIds) => {
        const newCoins = [...new Set([...subscribedCoinsRef.current, ...coinIds])];
        subscribedCoinsRef.current = newCoins;
        // Fetch immediately when subscribing to new coins
        fetchPricesFromApi(newCoins);
    }, [fetchPricesFromApi]);

    const fetchPrices = useCallback(async (coinIds) => {
        if (coinIds.length === 0) return;
        await fetchPricesFromApi(coinIds);
    }, [fetchPricesFromApi]);

    const getPrice = useCallback((coinId) => {
        return prices[coinId]?.usd || 0;
    }, [prices]);

    const get24hChange = useCallback((coinId) => {
        return prices[coinId]?.usd_24h_change || 0;
    }, [prices]);

    const value = { prices, eurRate, connected, subscribe, fetchPrices, getPrice, get24hChange };

    return <PriceContext.Provider value={value}>{children}</PriceContext.Provider>;
}

export function usePrices() {
    const ctx = useContext(PriceContext);
    if (!ctx) throw new Error('usePrices must be inside PriceProvider');
    return ctx;
}
