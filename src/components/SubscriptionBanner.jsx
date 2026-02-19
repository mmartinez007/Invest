import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap } from 'lucide-react';

export default function SubscriptionBanner() {
    const navigate = useNavigate();

    return (
        <div className="subscription-banner">
            <div>
                <h3>
                    <Zap size={16} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                    Unlock Advanced Analytics
                </h3>
                <p>Get Sharpe ratio, Sortino ratio, max drawdown, risk analysis, tax export, and more with Pro.</p>
            </div>
            <button className="btn btn-primary" onClick={() => navigate('/settings')}>
                Upgrade — $9.99/mo
            </button>
        </div>
    );
}
