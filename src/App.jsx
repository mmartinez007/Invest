import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CurrencyProvider } from './context/CurrencyContext';
import { PriceProvider } from './context/PriceContext';
import { ToastProvider } from './context/ToastContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import Market from './pages/Market';
import Watchlist from './pages/Watchlist';
import Transactions from './pages/Transactions';
import Sidebar from './components/Sidebar';
import BottomNav from './components/BottomNav';

function ProtectedRoute({ children }) {
    const { user, loading } = useAuth();
    if (loading) {
        return (
            <div className="app-loading">
                <div className="app-loading-inner">
                    <div className="app-loading-logo">
                        <svg viewBox="0 0 32 32" width="48" height="48">
                            <defs>
                                <linearGradient id="loadGrad" x1="0" y1="0" x2="1" y2="1">
                                    <stop offset="0%" stopColor="#6c5ce7" />
                                    <stop offset="100%" stopColor="#a855f7" />
                                </linearGradient>
                            </defs>
                            <rect rx="8" width="32" height="32" fill="url(#loadGrad)" />
                            <text x="16" y="22" textAnchor="middle" fill="white" fontSize="16" fontWeight="bold">C</text>
                        </svg>
                    </div>
                    <div className="spinner" />
                    <p style={{ color: 'var(--text-muted)', marginTop: 12, fontSize: '0.85rem' }}>Loading CryptoVault...</p>
                </div>
            </div>
        );
    }
    return user ? children : <Navigate to="/login" />;
}

function AppLayout() {
    return (
        <CurrencyProvider>
            <PriceProvider>
                <div className="app-layout">
                    <Sidebar />
                    <main className="main-content">
                        <Routes>
                            <Route path="/" element={<Dashboard />} />
                            <Route path="/market" element={<Market />} />
                            <Route path="/watchlist" element={<Watchlist />} />
                            <Route path="/analytics" element={<Analytics />} />
                            <Route path="/transactions" element={<Transactions />} />
                            <Route path="/settings" element={<Settings />} />
                            <Route path="*" element={<Navigate to="/" />} />
                        </Routes>
                    </main>
                    <BottomNav />
                </div>
            </PriceProvider>
        </CurrencyProvider>
    );
}

export default function App() {
    return (
        <BrowserRouter>
            <ToastProvider>
                <AuthProvider>
                    <Routes>
                        <Route path="/login" element={<Login />} />
                        <Route path="/register" element={<Register />} />
                        <Route
                            path="/*"
                            element={
                                <ProtectedRoute>
                                    <AppLayout />
                                </ProtectedRoute>
                            }
                        />
                    </Routes>
                </AuthProvider>
            </ToastProvider>
        </BrowserRouter>
    );
}
