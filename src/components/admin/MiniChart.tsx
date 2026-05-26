'use client';

interface MiniChartProps {
  data: { label: string; value: number }[];
  height?: number;
  accentColor?: string;
  formatValue?: (v: number) => string;
}

export default function MiniChart({
  data,
  height = 120,
  accentColor = '#D4AF37',
  formatValue = (v) => `$${(v / 1000).toFixed(0)}k`,
}: MiniChartProps) {
  const maxValue = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="w-full">
      <div className="flex items-end gap-1.5" style={{ height }}>
        {data.map((item, i) => {
          const barHeight = Math.max((item.value / maxValue) * 100, 4);
          const isToday = i === data.length - 1;

          return (
            <div
              key={i}
              className="flex-1 flex flex-col items-center gap-1 group relative"
            >
              {/* Tooltip */}
              <div
                className="absolute -top-8 opacity-0 group-hover:opacity-100 transition-opacity
                  text-xs px-2 py-1 rounded-lg whitespace-nowrap pointer-events-none z-10"
                style={{
                  background: 'rgba(17, 17, 19, 0.95)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#F5F5F0',
                }}
              >
                {formatValue(item.value)}
              </div>

              {/* Bar */}
              <div
                className="w-full rounded-t-md transition-all duration-500 ease-out"
                style={{
                  height: `${barHeight}%`,
                  background: isToday
                    ? `linear-gradient(to top, ${accentColor}, ${accentColor}CC)`
                    : `${accentColor}33`,
                  boxShadow: isToday ? `0 0 15px ${accentColor}30` : 'none',
                  minHeight: '3px',
                }}
              />
            </div>
          );
        })}
      </div>

      {/* Labels */}
      <div className="flex gap-1.5 mt-2">
        {data.map((item, i) => (
          <div key={i} className="flex-1 text-center">
            <span className="text-[10px] text-text-muted">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
