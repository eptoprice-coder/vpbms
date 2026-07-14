'use client';
import { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

const tooltipStyle = {
  background: 'rgba(13, 22, 40, 0.92)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 12,
  color: '#fff',
  fontSize: 12,
  backdropFilter: 'blur(8px)',
  boxShadow: '0 8px 32px rgba(5,9,20,0.5)',
};

// Renders a price trend for one product from PriceHistory entries (any order).
// entries: [{ createdAt, oldPrice, newPrice }], unit: e.g. "kg"
export default function PriceTrendChart({ entries = [], productName = '', unit = '' }) {
  const { data, stats } = useMemo(() => {
    const sorted = [...entries].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    const data = sorted.map((e) => ({
      date: new Date(e.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
      time: new Date(e.createdAt).toLocaleString(),
      price: e.newPrice,
    }));
    // include the starting price so a single update still draws a line
    if (sorted.length) {
      data.unshift({
        date: new Date(sorted[0].createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
        time: 'Starting price',
        price: sorted[0].oldPrice,
      });
    }
    const prices = data.map((d) => d.price);
    const first = prices[0] ?? 0;
    const last = prices[prices.length - 1] ?? 0;
    const stats = prices.length
      ? {
          current: last,
          min: Math.min(...prices),
          max: Math.max(...prices),
          avg: (prices.reduce((a, b) => a + b, 0) / prices.length).toFixed(1),
          change: last - first,
          changePct: first ? (((last - first) / first) * 100).toFixed(1) : '0',
        }
      : null;
    return { data, stats };
  }, [entries]);

  if (!entries.length) {
    return <p className="text-sm text-gray-400 py-8 text-center">No price updates recorded for this product yet.</p>;
  }

  const up = stats.change > 0;
  const flat = stats.change === 0;
  const TrendIcon = flat ? Minus : up ? TrendingUp : TrendingDown;
  const trendColor = flat ? 'text-gray-400' : up ? 'text-red-500' : 'text-brand-500';

  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mb-4">
        <div>
          <div className="text-xs uppercase tracking-wide text-gray-400">Current</div>
          <div className="text-xl font-bold tabular-nums">₹{stats.current}{unit ? <span className="text-xs font-normal text-gray-400">/{unit}</span> : null}</div>
        </div>
        <div className={`flex items-center gap-1.5 text-sm font-semibold ${trendColor}`}>
          <TrendIcon size={16} />
          {stats.change > 0 ? '+' : ''}{stats.change} ({stats.changePct}%)
        </div>
        <div className="text-xs text-gray-400 ml-auto flex gap-4">
          <span>Low <span className="font-semibold text-gray-600 dark:text-gray-200">₹{stats.min}</span></span>
          <span>High <span className="font-semibold text-gray-600 dark:text-gray-200">₹{stats.max}</span></span>
          <span>Avg <span className="font-semibold text-gray-600 dark:text-gray-200">₹{stats.avg}</span></span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={240}>
        <AreaChart data={data} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
          <defs>
            <linearGradient id="priceTrendFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={up ? '#f97316' : '#22c55e'} stopOpacity={0.4} />
              <stop offset="100%" stopColor={up ? '#f97316' : '#22c55e'} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.15)" vertical={false} />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="rgba(128,128,128,0.4)" />
          <YAxis tick={{ fontSize: 11 }} stroke="rgba(128,128,128,0.4)" domain={['auto', 'auto']} />
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(v) => [`₹${v}${unit ? `/${unit}` : ''}`, productName || 'Price']}
            labelFormatter={(label, payload) => payload?.[0]?.payload?.time || label}
          />
          <ReferenceLine y={Number(stats.avg)} stroke="rgba(128,128,128,0.35)" strokeDasharray="4 4" />
          <Area
            type="monotone"
            dataKey="price"
            stroke={up ? '#f97316' : '#22c55e'}
            strokeWidth={2.5}
            fill="url(#priceTrendFill)"
            dot={{ r: 3, strokeWidth: 0, fill: up ? '#f97316' : '#22c55e' }}
            activeDot={{ r: 5, stroke: '#fff', strokeWidth: 1.5 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
