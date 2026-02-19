import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, Mail, ArrowRight, Eye, EyeOff, UserPlus } from 'lucide-react';

export default function Register() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { register } = useAuth();
    const navigate = useNavigate();

    async function handleSubmit(e) {
        e.preventDefault();
        setError('');
        if (password !== confirmPassword) {
            return setError('Passwords do not match');
        }
        if (password.length < 6) {
            return setError('Password must be at least 6 characters');
        }
        setLoading(true);
        try {
            await register(email, password);
            navigate('/');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    const passwordStrength = getPasswordStrength(password);

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
                                    <linearGradient id="logoGrad2" x1="0" y1="0" x2="1" y2="1">
                                        <stop offset="0%" stopColor="#6c5ce7" />
                                        <stop offset="100%" stopColor="#a855f7" />
                                    </linearGradient>
                                </defs>
                                <rect rx="8" width="32" height="32" fill="url(#logoGrad2)" />
                                <text x="16" y="22" textAnchor="middle" fill="white" fontSize="16" fontWeight="bold">C</text>
                            </svg>
                        </div>
                        <span className="auth-logo-text">CryptoVault</span>
                    </div>
                    <h1>Create Account</h1>
                    <p>Start tracking your crypto investments</p>
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
                            {password.length > 0 && (
                                <div className="password-strength">
                                    <div className="password-bar">
                                        <div className={`password-fill strength-${passwordStrength.level}`} style={{ width: `${passwordStrength.pct}%` }} />
                                    </div>
                                    <span className={`password-label strength-${passwordStrength.level}`}>{passwordStrength.text}</span>
                                </div>
                            )}
                        </div>
                        <div className="form-group">
                            <label>Confirm Password</label>
                            <div className="input-with-icon">
                                <Lock size={16} className="input-icon" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="••••••••"
                                    value={confirmPassword}
                                    onChange={e => setConfirmPassword(e.target.value)}
                                    required
                                />
                            </div>
                        </div>
                        {error && <div className="form-error">{error}</div>}
                        <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
                            {loading ? (
                                <div className="spinner" style={{ width: 18, height: 18 }} />
                            ) : (
                                <>Create Account <UserPlus size={16} /></>
                            )}
                        </button>
                    </form>
                </div>
                <div className="auth-footer">
                    Already have an account? <Link to="/login">Sign in</Link>
                </div>
            </div>
        </div>
    );
}

function getPasswordStrength(pw) {
    if (pw.length === 0) return { level: 0, pct: 0, text: '' };
    let score = 0;
    if (pw.length >= 6) score++;
    if (pw.length >= 10) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;

    if (score <= 1) return { level: 1, pct: 20, text: 'Weak' };
    if (score <= 2) return { level: 2, pct: 40, text: 'Fair' };
    if (score <= 3) return { level: 3, pct: 60, text: 'Good' };
    if (score <= 4) return { level: 4, pct: 80, text: 'Strong' };
    return { level: 5, pct: 100, text: 'Very Strong' };
}
