import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, Mail, ArrowRight, Eye, EyeOff } from 'lucide-react';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    async function handleSubmit(e) {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await login(email, password);
            navigate('/');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="auth-page">
            <div className="auth-bg">
                <div className="auth-orb auth-orb-1" />
                <div className="auth-orb auth-orb-2" />
                <div className="auth-orb auth-orb-3" />
                <div className="auth-grid" />
            </div>
            <div className="auth-container">
                <div className="auth-header">
                    <div className="auth-logo">
                        <div className="auth-logo-icon">
                            <svg viewBox="0 0 32 32" width="32" height="32">
                                <defs>
                                    <linearGradient id="logoGrad" x1="0" y1="0" x2="1" y2="1">
                                        <stop offset="0%" stopColor="#6c5ce7" />
                                        <stop offset="100%" stopColor="#a855f7" />
                                    </linearGradient>
                                </defs>
                                <rect rx="8" width="32" height="32" fill="url(#logoGrad)" />
                                <text x="16" y="22" textAnchor="middle" fill="white" fontSize="16" fontWeight="bold">C</text>
                            </svg>
                        </div>
                        <span className="auth-logo-text">CryptoVault</span>
                    </div>
                    <h1>Welcome back</h1>
                    <p>Sign in to track your crypto portfolio</p>
                </div>
                <div className="auth-card">
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label>Email</label>
                            <div className="input-with-icon">
                                <Mail size={16} className="input-icon" />
                                <input
                                    type="email"
                                    placeholder="you@example.com"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    required
                                    autoFocus
                                />
                            </div>
                        </div>
                        <div className="form-group">
                            <label>Password</label>
                            <div className="input-with-icon">
                                <Lock size={16} className="input-icon" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    required
                                    minLength={6}
                                />
                                <button
                                    type="button"
                                    className="input-toggle"
                                    onClick={() => setShowPassword(!showPassword)}
                                    tabIndex={-1}
                                >
                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>
                        {error && <div className="form-error">{error}</div>}
                        <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
                            {loading ? (
                                <div className="spinner" style={{ width: 18, height: 18 }} />
                            ) : (
                                <>Sign In <ArrowRight size={16} /></>
                            )}
                        </button>
                    </form>
                </div>
                <div className="auth-footer">
                    Don't have an account? <Link to="/register">Create one</Link>
                </div>
                <div className="auth-features">
                    <div className="auth-feature">
                        <span>📊</span>
                        <span>Real-time Tracking</span>
                    </div>
                    <div className="auth-feature">
                        <span>📈</span>
                        <span>Advanced Analytics</span>
                    </div>
                    <div className="auth-feature">
                        <span>🔒</span>
                        <span>Bank-grade Security</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
