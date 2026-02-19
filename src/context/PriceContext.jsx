import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { API_DOMAIN, getWsUrl } from '../config';

const PriceContext = createContext(null);

export function PriceProvider({ children }) {
    const [prices, setPrices] = useState({});
    const [eurRate, setEurRate] = useState(0.92);
    const [connected, setConnected] = useState(false);
    const wsRef = useRef(null);
    const subscribedCoinsRef = useRef([]);

    // Connect WebSocket
    useEffect(() => {
        connectWs();
        return () => {
            if (wsRef.current) wsRef.current.close();
        };
    }, []);

    function connectWs() {
        try {
            const wsUrl = `${getWsUrl()}/ws`;
            const ws = new WebSocket(wsUrl);

            ws.onopen = () => {
                setConnected(true);
                // Re-subscribe
                if (subscribedCoinsRef.current.length > 0) {
                    ws.send(JSON.stringify({ type: 'subscribe', coins: subscribedCoinsRef.current }));
                }
            };

            ws.onmessage = (event) => {
                try {
                    const msg = JSON.parse(event.data);
                    if (msg.type === 'prices') {
                        setPrices(prev => ({ ...prev, ...msg.data }));
                        if (msg.eur_rate) setEurRate(msg.eur_rate);
                    }
                } catch {
                    // ignore parse errors
                }
            };

            ws.onclose = () => {
                setConnected(false);
                // Reconnect after 5 seconds
                setTimeout(connectWs, 5000);
            };

            ws.onerror = () => {
                ws.close();
            };

            wsRef.current = ws;
        } catch {
            setTimeout(connectWs, 5000);
        }
    }

    const subscribe = useCallback((coinIds) => {
        subscribedCoinsRef.current = [...new Set([...subscribedCoinsRef.current, ...coinIds])];
        if (wsRef.current?.readyState === 1) {
            wsRef.current.send(JSON.stringify({ type: 'subscribe', coins: subscribedCoinsRef.current }));
        }
    }, []);

    // REST fallback for fetching prices
    const fetchPrices = useCallback(async (coinIds) => {
        if (coinIds.length === 0) return;
        try {
            const res = await fetch(`${API_DOMAIN}/api/prices?ids=${coinIds.join(',')}`);
            if (res.ok) {
                const data = await res.json();
                setPrices(prev => ({ ...prev, ...data.prices }));
                if (data.eur_rate) setEurRate(data.eur_rate);
            }
        } catch {
            // silent
        }
    }, []);

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
