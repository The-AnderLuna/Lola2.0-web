'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ToastProvider } from '@/components/admin/Toast';
import {
  LayoutDashboard,
  CalendarDays,
  CalendarClock,
  List,
  Users,
  Sparkles,
  UserCog,
  CreditCard,
  Settings,
  LogOut,
  Menu,
  X,
  Crown,
  Bot,
  Tag,
} from 'lucide-react';

const NAV_ITEMS = [
  { href: '/admin', label: 'Resumen', icon: LayoutDashboard },
  { href: '/admin/agenda', label: 'Agenda', icon: CalendarClock },
  { href: '/admin/citas', label: 'Lista de Citas', icon: List },
  { href: '/admin/clientes', label: 'Clientes', icon: Users },
  { href: '/admin/servicios', label: 'Servicios', icon: Sparkles },
  { href: '/admin/staff', label: 'Staff', icon: UserCog },
  { href: '/admin/pagos', label: 'Pagos', icon: CreditCard },
  { href: '/admin/cupones', label: 'Cupones', icon: Tag },
  { href: '/admin/configuracion', label: 'Configuración', icon: Settings },
];

interface AdminShellProps {
  children: React.ReactNode;
  botActivo?: boolean;
}

export default function AdminShell({ children, botActivo: initialBotActivo = true }: AdminShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [botActivo, setBotActivo] = useState(initialBotActivo);
  const [togglingBot, setTogglingBot] = useState(false);

  // Close sidebar on navigation
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    await fetch('/api/auth/admin/logout', { method: 'POST' });
    router.push('/admin/login');
    router.refresh();
  };

  const handleToggleBot = async () => {
    setTogglingBot(true);
    try {
      const res = await fetch('/api/admin/configuracion', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bot_activo: !botActivo }),
      });
      if (res.ok) {
        setBotActivo(!botActivo);
      }
    } catch (err) {
      console.error('Error toggling bot:', err);
    } finally {
      setTogglingBot(false);
    }
  };

  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin';
    return pathname.startsWith(href);
  };

  return (
    <ToastProvider>
      <div className="min-h-screen flex">
        {/* ═══ SIDEBAR (Desktop) ═══ */}
        <aside
          className="hidden lg:flex flex-col w-[260px] fixed inset-y-0 left-0 z-40"
          style={{
            background: 'rgba(17, 17, 19, 0.85)',
            backdropFilter: 'blur(30px)',
            borderRight: '1px solid rgba(212, 175, 55, 0.12)',
          }}
        >
          {/* Logo */}
          <div className="px-6 py-6 flex items-center gap-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.2), rgba(212, 175, 55, 0.05))',
                border: '1px solid rgba(212, 175, 55, 0.3)',
              }}
            >
              <Crown className="w-5 h-5 text-gold" />
            </div>
            <div>
              <p className="font-display text-sm font-semibold text-text-primary">Mile Almanza</p>
              <p className="text-[10px] text-text-muted">Panel de Control</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {NAV_ITEMS.map((item) => {
              const active = isActive(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                    transition-all duration-200 group
                    ${active
                      ? 'text-gold'
                      : 'text-text-secondary hover:text-text-primary hover:bg-white/[0.03]'
                    }`}
                  style={active ? {
                    background: 'rgba(212, 175, 55, 0.08)',
                    boxShadow: 'inset 0 0 20px rgba(212, 175, 55, 0.05)',
                  } : {}}
                >
                  <Icon className={`w-5 h-5 transition-colors ${active ? 'text-gold' : 'text-text-muted group-hover:text-text-secondary'}`} />
                  {item.label}
                  {active && (
                    <div
                      className="ml-auto w-1.5 h-1.5 rounded-full"
                      style={{ background: '#D4AF37', boxShadow: '0 0 8px rgba(212, 175, 55, 0.6)' }}
                    />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Bot Toggle */}
          <div className="px-4 py-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-text-muted" />
                <span className="text-xs text-text-secondary">Bot Lola</span>
              </div>
              <button
                onClick={handleToggleBot}
                disabled={togglingBot}
                className="relative w-10 h-5 rounded-full transition-all duration-300 cursor-pointer disabled:opacity-50"
                style={{
                  background: botActivo
                    ? 'linear-gradient(135deg, #22C55E, #16A34A)'
                    : 'rgba(82, 82, 91, 0.5)',
                }}
                title={botActivo ? 'Bot activo — click para desactivar' : 'Bot inactivo — click para activar'}
              >
                <div
                  className="absolute top-0.5 w-4 h-4 rounded-full transition-all duration-300"
                  style={{
                    left: botActivo ? '22px' : '2px',
                    background: '#fff',
                    boxShadow: botActivo ? '0 0 8px rgba(34, 197, 94, 0.4)' : 'none',
                  }}
                />
              </button>
            </div>
          </div>

          {/* Logout */}
          <div className="px-3 pb-4">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium
                text-text-muted hover:text-red-urgency hover:bg-red-urgency/5 transition-all"
            >
              <LogOut className="w-5 h-5" />
              Cerrar Sesión
            </button>
          </div>
        </aside>

        {/* ═══ MOBILE HEADER ═══ */}
        <header
          className="lg:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3"
          style={{
            background: 'rgba(10, 10, 11, 0.9)',
            backdropFilter: 'blur(20px)',
            borderBottom: '1px solid rgba(212, 175, 55, 0.1)',
          }}
        >
          <div className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-gold" />
            <span className="font-display text-sm font-semibold text-text-primary">Mile Almanza</span>
          </div>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-text-secondary hover:text-text-primary
              transition-all hover:bg-white/5"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </header>

        {/* ═══ MOBILE SIDEBAR OVERLAY ═══ */}
        {sidebarOpen && (
          <>
            <div
              className="lg:hidden fixed inset-0 z-40"
              style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
              onClick={() => setSidebarOpen(false)}
            />
            <aside
              className="lg:hidden fixed inset-y-0 left-0 z-50 w-[280px] flex flex-col
                animate-fade-in-left"
              style={{
                background: 'rgba(17, 17, 19, 0.95)',
                backdropFilter: 'blur(30px)',
                borderRight: '1px solid rgba(212, 175, 55, 0.15)',
              }}
            >
              {/* Mobile Logo */}
              <div className="px-6 py-5 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="flex items-center gap-3">
                  <Crown className="w-5 h-5 text-gold" />
                  <span className="font-display text-sm font-semibold text-text-primary">Mile Almanza</span>
                </div>
                <button onClick={() => setSidebarOpen(false)} className="text-text-muted hover:text-text-primary">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Mobile Nav */}
              <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                {NAV_ITEMS.map((item) => {
                  const active = isActive(item.href);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium
                        transition-all duration-200
                        ${active ? 'text-gold' : 'text-text-secondary'}`}
                      style={active ? { background: 'rgba(212, 175, 55, 0.08)' } : {}}
                    >
                      <Icon className={`w-5 h-5 ${active ? 'text-gold' : 'text-text-muted'}`} />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>

              {/* Mobile Bot Toggle */}
              <div className="px-4 py-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-2">
                    <Bot className="w-4 h-4 text-text-muted" />
                    <span className="text-xs text-text-secondary">Bot Lola</span>
                  </div>
                  <button
                    onClick={handleToggleBot}
                    disabled={togglingBot}
                    className="relative w-10 h-5 rounded-full transition-all duration-300 cursor-pointer"
                    style={{ background: botActivo ? 'linear-gradient(135deg, #22C55E, #16A34A)' : 'rgba(82, 82, 91, 0.5)' }}
                  >
                    <div
                      className="absolute top-0.5 w-4 h-4 rounded-full transition-all duration-300"
                      style={{ left: botActivo ? '22px' : '2px', background: '#fff' }}
                    />
                  </button>
                </div>
              </div>

              {/* Mobile Logout */}
              <div className="px-3 pb-4">
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm
                    text-text-muted hover:text-red-urgency transition-all"
                >
                  <LogOut className="w-5 h-5" />
                  Cerrar Sesión
                </button>
              </div>
            </aside>
          </>
        )}

        {/* ═══ MAIN CONTENT ═══ */}
        <main className="flex-1 lg:ml-[260px] min-h-screen pt-14 lg:pt-0">
          <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </ToastProvider>
  );
}
