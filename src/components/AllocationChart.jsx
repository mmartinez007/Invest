import React from 'react';

export default function AllocationChart({ holdings, getPrice, portfolioValue, formatValue }) {
    if (!holdings || holdings.length === 0 || portfolioValue <= 0) return null;

    const colors = [
        '#6c5ce7', '#00d68f', '#ff4757', '#ffc107', '#00cec9',
        '#e17055', '#fd79a8', '#74b9ff', '#a29bfe', '#55efc4',
        '#fab1a0', '#81ecec', '#dfe6e9', '#636e72',
    ];

    const slices = holdings
        .map((h, i) => {
            const value = h.quantity * getPrice(h.coin_id);
            return {
                symbol: h.coin_symbol.toUpperCase(),
                name: h.coin_name || h.coin_symbol.toUpperCase(),
                value,
                pct: (value / portfolioValue) * 100,
                color: colors[i % colors.length],
            };
        })
        .sort((a, b) => b.value - a.value);

    // SVG Donut chart
    const size = 200;
    const cx = size / 2;
    const cy = size / 2;
    const outerR = 88;
    const innerR = 60;
    let currentAngle = -90; // Start from top

    const arcs = slices.map(slice => {
        const sweepAngle = (slice.pct / 100) * 360;
        const startAngle = currentAngle;
        const endAngle = currentAngle + sweepAngle;
        currentAngle = endAngle;

        const startRad = (startAngle * Math.PI) / 180;
        const endRad = (endAngle * Math.PI) / 180;
        const largeArc = sweepAngle > 180 ? 1 : 0;

        const x1Outer = cx + outerR * Math.cos(startRad);
        const y1Outer = cy + outerR * Math.sin(startRad);
        const x2Outer = cx + outerR * Math.cos(endRad);
        const y2Outer = cy + outerR * Math.sin(endRad);
        const x1Inner = cx + innerR * Math.cos(endRad);
        const y1Inner = cy + innerR * Math.sin(endRad);
        const x2Inner = cx + innerR * Math.cos(startRad);
        const y2Inner = cy + innerR * Math.sin(startRad);

        const path = [
            `M ${x1Outer} ${y1Outer}`,
            `A ${outerR} ${outerR} 0 ${largeArc} 1 ${x2Outer} ${y2Outer}`,
            `L ${x1Inner} ${y1Inner}`,
            `A ${innerR} ${innerR} 0 ${largeArc} 0 ${x2Inner} ${y2Inner}`,
            'Z'
        ].join(' ');

        return { ...slice, path };
    });

    return (
        <div className="allocation-chart">
            <div className="allocation-donut">
                <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                    {arcs.map((arc, i) => (
                        <path
                            key={i}
                            d={arc.path}
                            fill={arc.color}
                            stroke="var(--bg-card)"
                            strokeWidth="2"
                            style={{ transition: 'opacity 0.2s' }}
                        >
                            <title>{arc.symbol}: {arc.pct.toFixed(1)}%</title>
                        </path>
                    ))}
                    <text x={cx} y={cy - 6} textAnchor="middle" fill="var(--text-primary)" fontSize="13" fontWeight="700">
                        {slices.length}
                    </text>
                    <text x={cx} y={cy + 10} textAnchor="middle" fill="var(--text-muted)" fontSize="9">
                        Assets
                    </text>
                </svg>
            </div>
            <div className="allocation-legend">
                {slices.map((s, i) => (
                    <div key={i} className="allocation-item">
                        <div className="allocation-color" style={{ background: s.color }} />
                        <span className="allocation-symbol">{s.symbol}</span>
                        <span className="allocation-pct">{s.pct.toFixed(1)}%</span>
                        <span className="allocation-value">{formatValue(s.value)}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
