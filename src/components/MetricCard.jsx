import React from 'react';

export default function MetricCard({ label, value, subtitle, positive }) {
    let valueClass = 'metric-value';
    if (positive === true) valueClass += ' positive';
    else if (positive === false) valueClass += ' negative';

    return (
        <div className="metric-card">
            <div className="metric-label">{label}</div>
            <div className={valueClass}>{value}</div>
            {subtitle && <div className="metric-subtitle">{subtitle}</div>}
        </div>
    );
}
