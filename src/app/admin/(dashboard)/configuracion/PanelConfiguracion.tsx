'use client';

import { useState, useEffect } from 'react';
import { Settings, Save, CreditCard, Bot, MapPin, Shield, Phone } from 'lucide-react';
import { useToast } from '@/components/admin/Toast';

interface Config {
  id: string;
  nequi_numero: string | null;
  daviplata_numero: string | null;
  titular_cuenta: string | null;
  recargo_tarjeta_porcentaje: number | null;
  acepta_tarjeta: boolean | null;
  acepta_sistecredito: boolean | null;
  bot_activo: boolean | null;
  mensaje_bienvenida: string | null;
  porcentaje_anticipo: number | null;
  dias_reagendar: number | null;
  politica_cancelacion: number | null;
  ubicacion_texto: string | null;
  ubicacion_maps: string | null;
  telegram_bot_token: string | null;
  admin_telegram_id: string | null;
  telegram_topic_pagos: number | null;
  telegram_topic_atencion_cliente: number | null;
  telegram_topic_pagos_restantes: number | null;
  whatsapp_numero: string | null;
}

export default function PanelConfiguracion() {
  const { showToast } = useToast();
  const [config, setConfig] = useState<Config | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('pagos');

  useEffect(() => { fetchConfig(); }, []);

  const fetchConfig = async () => {
    try {
      const res = await fetch('/api/admin/configuracion');
      if (res.ok) { const json = await res.json(); setConfig(json.data); }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    try {
      const { id, ...updates } = config;
      void id;
      const res = await fetch('/api/admin/configuracion', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updates),
      });
      if (res.ok) showToast('Configuración guardada', 'success');
      else showToast('Error al guardar', 'error');
    } catch { showToast('Error de conexión', 'error'); }
    finally { setSaving(false); }
  };

  const update = (field: keyof Config, value: string | number | boolean | null) => {
    if (!config) return;
    setConfig({ ...config, [field]: value });
  };

  const TABS = [
    { id: 'pagos', label: 'Métodos de Pago', icon: CreditCard },
    { id: 'bot', label: 'Bot Lola', icon: Bot },
    { id: 'negocio', label: 'Negocio', icon: MapPin },
    { id: 'politicas', label: 'Políticas', icon: Shield },
    { id: 'telegram', label: 'Telegram', icon: Phone },
  ];

  if (loading) return <div className="p-8 text-text-muted">Cargando configuración...</div>;
  if (!config) return <div className="p-8 text-text-muted">Error cargando configuración</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-text-primary">Configuración</h1>
          <p className="text-sm text-text-secondary mt-1">Ajustes generales del negocio</p>
        </div>
        <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 hover:shadow-[0_0_20px_rgba(212,175,55,0.3)] active:scale-[0.97]" style={{ background: 'linear-gradient(135deg, #D4AF37, #A8860A)', color: '#0A0A0B' }}>
          <Save className="w-4 h-4" /> {saving ? 'Guardando...' : 'Guardar Cambios'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
        {TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${activeTab === tab.id ? 'text-gold' : 'text-text-muted hover:text-text-secondary'}`} style={activeTab === tab.id ? { background: 'rgba(212, 175, 55, 0.1)', border: '1px solid rgba(212, 175, 55, 0.3)' } : { background: 'rgba(34, 34, 40, 0.5)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <Icon className="w-3.5 h-3.5" /> {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="rounded-2xl p-6" style={{ background: 'rgba(17, 17, 19, 0.6)', border: '1px solid rgba(212, 175, 55, 0.1)' }}>
        {activeTab === 'pagos' && (
          <div className="space-y-5">
            <h2 className="text-sm font-semibold text-text-primary flex items-center gap-2"><CreditCard className="w-4 h-4 text-gold" /> Métodos de Pago</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Número Nequi" value={config.nequi_numero || ''} onChange={v => update('nequi_numero', v)} />
              <Field label="Número Daviplata" value={config.daviplata_numero || ''} onChange={v => update('daviplata_numero', v)} />
              <Field label="Titular de la Cuenta" value={config.titular_cuenta || ''} onChange={v => update('titular_cuenta', v)} />
              <Field label="Recargo Tarjeta (%)" value={config.recargo_tarjeta_porcentaje?.toString() || '0'} onChange={v => update('recargo_tarjeta_porcentaje', parseFloat(v) || 0)} type="number" />
            </div>
            <div className="flex gap-6 pt-2">
              <Toggle label="Acepta Tarjeta" value={config.acepta_tarjeta ?? false} onChange={v => update('acepta_tarjeta', v)} />
              <Toggle label="Acepta SisteCrédito" value={config.acepta_sistecredito ?? false} onChange={v => update('acepta_sistecredito', v)} />
            </div>
          </div>
        )}

        {activeTab === 'bot' && (
          <div className="space-y-5">
            <h2 className="text-sm font-semibold text-text-primary flex items-center gap-2"><Bot className="w-4 h-4 text-gold" /> Bot Lola</h2>
            <Toggle label="Bot Activo" value={config.bot_activo ?? true} onChange={v => update('bot_activo', v)} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Número de WhatsApp" value={config.whatsapp_numero || ''} onChange={v => update('whatsapp_numero', v)} />
              <Field label="Porcentaje de Anticipo (%)" value={config.porcentaje_anticipo?.toString() || '0'} onChange={v => update('porcentaje_anticipo', parseFloat(v) || 0)} type="number" />
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-1.5">Mensaje de Bienvenida</label>
              <textarea value={config.mensaje_bienvenida || ''} onChange={e => update('mensaje_bienvenida', e.target.value)} rows={4} className="w-full px-3 py-2.5 rounded-xl text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-gold/30 resize-none" style={{ background: 'rgba(34, 34, 40, 0.8)', border: '1px solid rgba(255,255,255,0.07)' }} />
            </div>
          </div>
        )}

        {activeTab === 'negocio' && (
          <div className="space-y-5">
            <h2 className="text-sm font-semibold text-text-primary flex items-center gap-2"><MapPin className="w-4 h-4 text-gold" /> Datos del Negocio</h2>
            <div className="grid grid-cols-1 gap-4">
              <Field label="Ubicación (texto)" value={config.ubicacion_texto || ''} onChange={v => update('ubicacion_texto', v)} />
              <Field label="Link Google Maps" value={config.ubicacion_maps || ''} onChange={v => update('ubicacion_maps', v)} />
            </div>
          </div>
        )}

        {activeTab === 'politicas' && (
          <div className="space-y-5">
            <h2 className="text-sm font-semibold text-text-primary flex items-center gap-2"><Shield className="w-4 h-4 text-gold" /> Políticas</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Días para Reagendar" value={config.dias_reagendar?.toString() || '0'} onChange={v => update('dias_reagendar', parseInt(v) || 0)} type="number" />
              <Field label="Política de Cancelación (horas)" value={config.politica_cancelacion?.toString() || '0'} onChange={v => update('politica_cancelacion', parseInt(v) || 0)} type="number" />
            </div>
          </div>
        )}

        {activeTab === 'telegram' && (
          <div className="space-y-5">
            <h2 className="text-sm font-semibold text-text-primary flex items-center gap-2"><Settings className="w-4 h-4 text-gold" /> Telegram</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Bot Token" value={config.telegram_bot_token || ''} onChange={v => update('telegram_bot_token', v)} />
              <Field label="Admin Telegram ID" value={config.admin_telegram_id || ''} onChange={v => update('admin_telegram_id', v)} />
              <Field label="Topic Pagos (ID)" value={config.telegram_topic_pagos?.toString() || ''} onChange={v => update('telegram_topic_pagos', parseInt(v) || null)} type="number" />
              <Field label="Topic Atención al Cliente (ID)" value={config.telegram_topic_atencion_cliente?.toString() || ''} onChange={v => update('telegram_topic_atencion_cliente', parseInt(v) || null)} type="number" />
              <Field label="Topic Pagos Restantes (ID)" value={config.telegram_topic_pagos_restantes?.toString() || ''} onChange={v => update('telegram_topic_pagos_restantes', parseInt(v) || null)} type="number" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label className="block text-xs text-text-secondary mb-1.5">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} className="w-full px-3 py-2.5 rounded-xl text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-gold/30" style={{ background: 'rgba(34, 34, 40, 0.8)', border: '1px solid rgba(255,255,255,0.07)' }} />
    </div>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <button onClick={() => onChange(!value)} className="relative w-10 h-5 rounded-full transition-all duration-300" style={{ background: value ? 'linear-gradient(135deg, #22C55E, #16A34A)' : 'rgba(82, 82, 91, 0.5)' }}>
        <div className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all duration-300" style={{ left: value ? '22px' : '2px' }} />
      </button>
      <span className="text-sm text-text-secondary">{label}</span>
    </label>
  );
}
