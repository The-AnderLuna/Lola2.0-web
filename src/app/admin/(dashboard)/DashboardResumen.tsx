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
  const [rango, setRango] = useState('hoy');

  useEffect(() => {
    fetchResumen();
  }, [rango]);

  const fetchResumen = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/resumen?rango=${rango}`);
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
    <div className="space-y-8 relative">
      {/* Luces de ambiente sutiles en las esquinas */}
      <div className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full blur-[120px] opacity-[0.03] pointer-events-none"
        style={{ background: 'radial-gradient(circle, #D4AF37, transparent)' }} />
      <div className="absolute top-[20%] left-0 w-[300px] h-[300px] rounded-full blur-[100px] opacity-[0.02] pointer-events-none"
        style={{ background: 'radial-gradient(circle, #E63946, transparent)' }} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2"
        style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.03)' }}>
        <div>
          <h1 className="font-display text-3xl font-light text-text-primary uppercase">
            Resumen
          </h1>
        </div>
        
        {/* Fecha y Filtro */}
        <div className="flex items-center gap-4">
          <div className="text-sm text-text-secondary">
            <span className="capitalize">{dateString}</span>
          </div>
          <select 
            value={rango}
            onChange={(e) => setRango(e.target.value)}
            className="bg-black/50 border border-gold/20 text-text-primary text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-gold/50 cursor-pointer"
          >
            <option value="hoy">Hoy</option>
            <option value="7d">Últimos 7 días</option>
            <option value="30d">Último Mes</option>
          </select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 stagger">
        <div className="animate-fade-in-up">
          <KpiCard
            icon={<CalendarDays className="w-5 h-5" />}
            title="Citas"
            value={data.totalCitasHoy}
            subtitle={data.totalCitasHoy === 1 ? '1 cita' : `${data.totalCitasHoy} citas programadas`}
            accentColor="#D4AF37"
          />
        </div>
        <div className="animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          <KpiCard
            icon={<DollarSign className="w-5 h-5" />}
            title="Ingresos Estimados"
            value={formatCurrency(data.ingresoHoy)}
            subtitle="Confirmadas + completadas"
            accentColor="#10B981"
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
            subtitle="En este periodo"
            accentColor="#3B82F6"
          />
        </div>
      </div>

      {/* Two Column Layout: Citas de Hoy + Ingresos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Citas de Hoy - List */}
        <div
          className="lg:col-span-2 rounded-3xl p-6 relative overflow-hidden"
          style={{
            background: 'linear-gradient(145deg, rgba(20, 20, 25, 0.7) 0%, rgba(10, 10, 12, 0.9) 100%)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255,255,255,0.02)',
          }}
        >
          {/* Línea sutil de acento superior */}
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-gold/15 to-transparent" />

          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display font-light text-lg text-text-primary tracking-wide flex items-center gap-2.5 uppercase">
              <CalendarDays className="w-4 h-4 text-gold" />
              Citas
            </h2>
            <a
              href="/admin/citas"
              className="text-xs text-gold/80 hover:text-gold flex items-center gap-1.5 transition-all hover:translate-x-0.5"
            >
              Ver todas <ArrowRight className="w-3 h-3 text-gold" />
            </a>
          </div>

          {data.citasHoy.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mb-5"
                style={{
                  background: 'radial-gradient(circle, rgba(212, 175, 55, 0.08) 0%, rgba(212, 175, 55, 0.01) 100%)',
                  border: '1px solid rgba(212, 175, 55, 0.15)',
                  color: '#D4AF37',
                  boxShadow: '0 0 15px rgba(212, 175, 55, 0.02)'
                }}
              >
                <CalendarDays className="w-7 h-7" />
              </div>
              <h3 className="text-md font-semibold text-text-primary mb-1.5">Sin citas programadas</h3>
              <p className="text-xs text-text-muted max-w-xs">No hay reservas activas en la agenda para el día de hoy.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {data.citasHoy.slice(0, 8).map((cita) => (
                <div
                  key={cita.id}
                  className="flex items-center gap-4 p-3.5 rounded-2xl transition-all hover:bg-white/[0.02] group"
                  style={{
                    background: 'rgba(15, 15, 18, 0.4)',
                    border: '1px solid rgba(255,255,255,0.03)'
                  }}
                >
                  {/* Hora */}
                  <div className="text-center min-w-[70px]">
                    <p className="text-sm font-semibold text-gold tracking-wide" style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {formatTime(cita.fecha_hora_inicio)}
                    </p>
                  </div>

                  {/* Separator */}
                  <div className="w-px h-8 bg-white/10" />

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-text-primary truncate group-hover:text-gold transition-colors duration-200">
                      {cita.clientes?.nombre || 'Cliente sin nombre'}
                    </p>
                    <p className="text-xs text-text-muted truncate mt-0.5">
                      <span className="text-text-secondary">{cita.servicios?.nombre || 'Servicio'}</span>
                      <span className="mx-1.5">·</span>
                      <span>Atendido por {cita.profesionales?.nombre || 'Especialista'}</span>
                    </p>
                  </div>

                  {/* Status + Price */}
                  <div className="flex items-center gap-4 flex-shrink-0">
                    <StatusBadge estado={cita.estado} />
                    <span className="text-sm font-bold text-text-primary hidden sm:block" style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {formatCurrency(cita.precio_total)}
                    </span>
                  </div>
                </div>
              ))}
              {data.citasHoy.length > 8 && (
                <p className="text-xs text-text-muted text-center pt-3 font-medium">
                  +{data.citasHoy.length - 8} citas más programadas para hoy
                </p>
              )}
            </div>
          )}
        </div>

        {/* Revenue Chart */}
        <div
          className="rounded-3xl p-6 relative overflow-hidden flex flex-col justify-between"
          style={{
            background: 'linear-gradient(145deg, rgba(20, 20, 25, 0.7) 0%, rgba(10, 10, 12, 0.9) 100%)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255,255,255,0.02)',
          }}
        >
          {/* Línea sutil de acento superior */}
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-gold/15 to-transparent" />
          
          {/* Sutil resplandor de fondo para el gráfico */}
          <div className="absolute bottom-0 right-0 w-[150px] h-[150px] rounded-full blur-[80px] opacity-[0.02] pointer-events-none"
            style={{ background: 'radial-gradient(circle, #D4AF37, transparent)' }} />

          <div>
            <div className="flex items-center gap-2 mb-6">
              <TrendingUp className="w-4 h-4 text-gold" />
              <h2 className="font-display font-light text-lg text-text-primary tracking-wide uppercase">Ingresos 7 Días</h2>
            </div>

            <div className="py-2">
              <MiniChart
                data={data.ingresosPorDia}
                height={140}
                formatValue={(v) => formatCurrency(v)}
              />
            </div>
          </div>

          <div className="mt-6 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <p className="text-[10px] text-text-muted uppercase tracking-wider font-semibold">Total facturado en la semana</p>
            <p className="text-2xl font-bold text-gold mt-1" style={{ fontVariantNumeric: 'tabular-nums' }}>
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
