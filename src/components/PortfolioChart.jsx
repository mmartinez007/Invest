import React from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export default function PortfolioChart({ data, currency, symbol, convert }) {
    if (!data || data.length === 0) return null;

    const chartData = data.map(d => ({
        date: d.date,
        value: convert ? convert(d.value) : d.value,
    }));

    const minValue = Math.min(...chartData.map(d => d.value));
    const maxValue = Math.max(...chartData.map(d => d.value));
    const isPositive = chartData.length > 1 ? chartData[chartData.length - 1].value >= chartData[0].value : true;

    const color = isPositive ? '#00d68f' : '#ff4757';

    return (
        <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={color} stopOpacity={0} />
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis
                    dataKey="date"
                    tick={{ fill: '#5a5a6e', fontSize: 11 }}
                    axisLine={{ stroke: '#2a2a3a' }}
                    tickLine={false}
                    tickFormatter={(val) => {
                        const d = new Date(val);
                        return `${d.getMonth() + 1}/${d.getDate()}`;
                    }}
                />
                <YAxis
                    tick={{ fill: '#5a5a6e', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    domain={[minValue * 0.98, maxValue * 1.02]}
                    tickFormatter={(val) => `${symbol}${val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val.toFixed(0)}`}
                    width={65}
                />
                <Tooltip
                    contentStyle={{
                        background: '#1a1a26',
                        border: '1px solid #2a2a3a',
                        borderRadius: '8px',
                        color: '#fff',
                        fontSize: '0.85rem',
                    }}
                    formatter={(value) => [`${symbol}${value.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 'Value']}
                    labelFormatter={(label) => new Date(label).toLocaleDateString()}
                />
                <Area
                    type="monotone"
                    dataKey="value"
                    stroke={color}
                    strokeWidth={2}
                    fill="url(#colorValue)"
                    dot={false}
                    activeDot={{ r: 4, fill: color, stroke: '#1a1a26', strokeWidth: 2 }}
                />
            </AreaChart>
        </ResponsiveContainer>
    );
}
