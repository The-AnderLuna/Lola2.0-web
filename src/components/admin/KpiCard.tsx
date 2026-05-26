'use client';

import { ReactNode, useEffect, useRef } from 'react';

interface KpiCardProps {
  icon: ReactNode;
  title: string;
  value: number | string;
  subtitle?: string;
  accentColor?: string;
  animate?: boolean;
}

export default function KpiCard({ icon, title, value, subtitle, accentColor = '#D4AF37', animate = true }: KpiCardProps) {
  const valueRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!animate || typeof value !== 'number' || !valueRef.current) return;

    const target = value;
    const duration = 1200;
    const start = performance.now();

    const step = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
      const current = Math.round(eased * target);

      if (valueRef.current) {
        valueRef.current.textContent = current.toLocaleString('es-CO');
      }

      if (progress < 1) {
        requestAnimationFrame(step);
      }
    };

    requestAnimationFrame(step);
  }, [value, animate]);

  return (
    <div
      className="relative rounded-2xl p-5 transition-all duration-300 hover:translate-y-[-2px] group overflow-hidden"
      style={{
        background: 'rgba(17, 17, 19, 0.6)',
        backdropFilter: 'blur(20px)',
        border: `1px solid ${accentColor}22`,
      }}
    >
      {/* Glow effect on hover */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl pointer-events-none"
        style={{ boxShadow: `inset 0 0 40px ${accentColor}08` }}
      />

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: `${accentColor}15`, color: accentColor }}
          >
            {icon}
          </div>
        </div>

        <div className="space-y-1">
          <span
            ref={typeof value === 'number' ? valueRef : undefined}
            className="text-3xl font-bold text-text-primary"
            style={{ fontVariantNumeric: 'tabular-nums' }}
          >
            {typeof value === 'number' ? '0' : value}
          </span>
          <p className="text-sm text-text-secondary">{title}</p>
          {subtitle && (
            <p className="text-xs text-text-muted">{subtitle}</p>
          )}
        </div>
      </div>
    </div>
  );
}
