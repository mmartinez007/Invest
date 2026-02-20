-- CryptoVault — Supabase Migration Script
-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor → New Query)

-- 1. Users table
CREATE TABLE users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    subscription_tier TEXT DEFAULT 'free',
    base_currency TEXT DEFAULT 'USD',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Portfolios table
CREATE TABLE portfolios (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Orders table
CREATE TABLE orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
    coin_id TEXT NOT NULL,
    coin_symbol TEXT NOT NULL,
    coin_name TEXT DEFAULT '',
    type TEXT NOT NULL CHECK (type IN ('buy', 'sell')),
    quantity DOUBLE PRECISION NOT NULL,
    price_usd DOUBLE PRECISION NOT NULL,
    fee_usd DOUBLE PRECISION DEFAULT 0,
    date TIMESTAMPTZ NOT NULL,
    notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. User Settings table
CREATE TABLE user_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    view_mode TEXT DEFAULT 'simple',
    theme TEXT DEFAULT 'dark',
    gdpr_consent BOOLEAN DEFAULT FALSE,
    data_export_requested BOOLEAN DEFAULT FALSE,
    alerts_enabled BOOLEAN DEFAULT TRUE
);

-- 5. Watchlist table
CREATE TABLE watchlist (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    coin_id TEXT NOT NULL,
    coin_symbol TEXT NOT NULL,
    coin_name TEXT DEFAULT '',
    coin_thumb TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, coin_id)
);

-- 6. Price Snapshots table
CREATE TABLE price_snapshots (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
    total_value_usd DOUBLE PRECISION NOT NULL,
    snapshot_date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_portfolios_user ON portfolios(user_id);
CREATE INDEX idx_orders_portfolio ON orders(portfolio_id);
CREATE INDEX idx_orders_coin ON orders(portfolio_id, coin_id);
CREATE INDEX idx_watchlist_user ON watchlist(user_id);
CREATE INDEX idx_snapshots_portfolio ON price_snapshots(portfolio_id);
CREATE INDEX idx_snapshots_date ON price_snapshots(portfolio_id, snapshot_date);
