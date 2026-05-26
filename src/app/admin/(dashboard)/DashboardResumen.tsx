'use client';

import { useState, useEffect } from 'react';
import {
  CalendarDays,
  DollarSign,
  Clock,
  UserPlus,
  TrendingUp,
  ArrowRight,
} from 'lucide-react';
import KpiCard from '@/components/admin/KpiCard';
import MiniChart from '@/components/admin/MiniChart';
import StatusBadge from '@/components/admin/StatusBadge';
import EmptyState from '@/components/admin/EmptyState';

interface CitaHoy {
  id: string;
  estado: string;
  fecha_hora_inicio: string;
  fecha_hora_fin: string;
  precio_total: number;
  clientes: { nombre: string; telefono: string } | null;
  servicios: { nombre: string; categoria: string } | null;
  profesionales: { nombre: string } | null;
}

interface PreAgenda {
  id: string;
  expires_at: string | null;
  fecha_hora_inicio: string;
  precio_total: number;
  clientes: { nombre: string } | null;
  servicios: { nombre: string } | null;
}

interface ResumenData {
  citasHoy: CitaHoy[];
  totalCitasHoy: number;
  ingresoHoy: number;
  preAgendas: PreAgenda[];
  totalPreAgendas: number;
  clientesNuevosHoy: number;
  ingresosPorDia: { label: string; value: number }[];
}

export default function DashboardResumen() {
  const [data, setData] = useState<ResumenData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchResumen();
  }, []);

  const fetchResumen = async () => {
    try {
      const res = await fetch('/api/admin/resumen');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Error fetching resumen:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value);

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 rounded-lg" style={{ background: 'rgba(255,255,255,0.05)' }} />
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-32 rounded-2xl" style={{ background: 'rgba(255,255,255,0.03)' }} />
          ))}
        </div>
        <div className="h-64 rounded-2xl" style={{ background: 'rgba(255,255,255,0.03)' }} />
      </div>
    );
  }

  if (!data) return null;

  const today = new Date();
  const dateString = today.toLocaleDateString('es-CO', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-bold text-text-primary">
          Resumen del Día
        </h1>
        <p className="text-sm text-text-secondary mt-1 capitalize">{dateString}</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 stagger">
        <div className="animate-fade-in-up">
          <KpiCard
            icon={<CalendarDays className="w-5 h-5" />}
            title="Citas de Hoy"
            value={data.totalCitasHoy}
            subtitle={data.totalCitasHoy === 1 ? '1 cita programada' : `${data.totalCitasHoy} citas programadas`}
          />
        </div>
        <div className="animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          <KpiCard
            icon={<DollarSign className="w-5 h-5" />}
            title="Ingresos Estimados"
            value={formatCurrency(data.ingresoHoy)}
            subtitle="Confirmadas + completadas"
            animate={false}
          />
        </div>
        <div className="animate-fade-in-up" style={{ animationDelay: '200ms' }}>
          <KpiCard
            icon={<Clock className="w-5 h-5" />}
            title="Pre-agendas Activas"
            value={data.totalPreAgendas}
            subtitle="Esperando pago"
            accentColor="#F59E0B"
          />
        </div>
        <div className="animate-fade-in-up" style={{ animationDelay: '300ms' }}>
          <KpiCard
            icon={<UserPlus className="w-5 h-5" />}
            title="Clientes Nuevos"
            value={data.clientesNuevosHoy}
            subtitle="Registrados hoy"
            accentColor="#3B82F6"
          />
        </div>
      </div>

      {/* Two Column Layout: Citas de Hoy + Ingresos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Citas de Hoy - List */}
        <div
          className="lg:col-span-2 rounded-2xl p-5"
          style={{
            background: 'rgba(17, 17, 19, 0.6)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(212, 175, 55, 0.1)',
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-text-primary flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-gold" />
              Citas de Hoy
            </h2>
            <a
              href="/admin/citas"
              className="text-xs text-gold hover:text-gold-light flex items-center gap-1 transition-colors"
            >
              Ver todas <ArrowRight className="w-3 h-3" />
            </a>
          </div>

          {data.citasHoy.length === 0 ? (
            <EmptyState
              icon={<CalendarDays className="w-8 h-8" />}
              title="Sin citas hoy"
              description="No hay citas programadas para hoy"
            />
          ) : (
            <div className="space-y-2">
              {data.citasHoy.slice(0, 8).map((cita) => (
                <div
                  key={cita.id}
                  className="flex items-center gap-4 p-3 rounded-xl transition-all hover:bg-white/[0.02] group"
                  style={{ border: '1px solid rgba(255,255,255,0.03)' }}
                >
                  {/* Hora */}
                  <div className="text-center min-w-[60px]">
                    <p className="text-sm font-semibold text-text-primary" style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {formatTime(cita.fecha_hora_inicio)}
                    </p>
                  </div>

                  {/* Separator */}
                  <div className="w-px h-8 bg-border-subtle" />

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">
                      {cita.clientes?.nombre || 'Cliente'}
                    </p>
                    <p className="text-xs text-text-muted truncate">
                      {cita.servicios?.nombre || 'Servicio'} · {cita.profesionales?.nombre || 'Profesional'}
                    </p>
                  </div>

                  {/* Status + Price */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <StatusBadge estado={cita.estado} />
                    <span className="text-xs text-text-secondary hidden sm:block" style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {formatCurrency(cita.precio_total)}
                    </span>
                  </div>
                </div>
              ))}
              {data.citasHoy.length > 8 && (
                <p className="text-xs text-text-muted text-center pt-2">
                  +{data.citasHoy.length - 8} citas más
                </p>
              )}
            </div>
          )}
        </div>

        {/* Revenue Chart */}
        <div
          className="rounded-2xl p-5"
          style={{
            background: 'rgba(17, 17, 19, 0.6)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(212, 175, 55, 0.1)',
          }}
        >
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp className="w-4 h-4 text-gold" />
            <h2 className="font-semibold text-text-primary">Ingresos 7 Días</h2>
          </div>

          <MiniChart
            data={data.ingresosPorDia}
            height={140}
            formatValue={(v) => formatCurrency(v)}
          />

          <div className="mt-4 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <p className="text-xs text-text-muted">Total semana</p>
            <p className="text-lg font-bold text-gold" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {formatCurrency(data.ingresosPorDia.reduce((s, d) => s + d.value, 0))}
            </p>
          </div>
        </div>
      </div>

      {/* Pre-agendas Activas */}
      {data.preAgendas.length > 0 && (
        <div
          className="rounded-2xl p-5"
          style={{
            background: 'rgba(17, 17, 19, 0.6)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(245, 158, 11, 0.15)',
          }}
        >
          <h2 className="font-semibold text-text-primary flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4 text-amber-400" />
            Pre-agendas Activas
            <span
              className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#F59E0B' }}
            >
              {data.totalPreAgendas}
            </span>
          </h2>

          <div className="space-y-2">
            {data.preAgendas.map((pa) => (
              <PreAgendaRow key={pa.id} preAgenda={pa} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Sub-component: Pre-agenda with live countdown
function PreAgendaRow({ preAgenda }: { preAgenda: PreAgenda }) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    if (!preAgenda.expires_at) return;

    const update = () => {
      const now = Date.now();
      const expires = new Date(preAgenda.expires_at!).getTime();
      const diff = expires - now;

      if (diff <= 0) {
        setTimeLeft('Expirada');
        return;
      }

      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${mins}:${secs.toString().padStart(2, '0')}`);
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [preAgenda.expires_at]);

  const isExpiring = timeLeft !== 'Expirada' && parseInt(timeLeft) < 5;

  return (
    <div
      className="flex items-center justify-between p-3 rounded-xl"
      style={{ background: 'rgba(245, 158, 11, 0.03)', border: '1px solid rgba(245, 158, 11, 0.08)' }}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text-primary truncate">
          {preAgenda.clientes?.nombre || 'Cliente'}
        </p>
        <p className="text-xs text-text-muted truncate">
          {preAgenda.servicios?.nombre || 'Servicio'}
        </p>
      </div>

      <div className="flex items-center gap-3 flex-shrink-0">
        <span
          className={`text-sm font-mono font-bold ${isExpiring ? 'text-red-urgency animate-pulse' : 'text-amber-400'}`}
          style={{ fontVariantNumeric: 'tabular-nums' }}
        >
          ⏳ {timeLeft}
        </span>
      </div>
    </div>
  );
}
