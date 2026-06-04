'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Mail, Eye, EyeOff, Crown, AlertCircle } from 'lucide-react';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Error al iniciar sesión');
        setLoading(false);
        return;
      }

      router.push('/admin');
      router.refresh();
    } catch {
      setError('Error de conexión. Intenta de nuevo.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden bg-[#070708]">
      {/* Luces de ambiente premium */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full blur-[150px] opacity-15"
          style={{ background: 'radial-gradient(circle, #D4AF37, transparent 70%)' }} />
        <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full blur-[130px] opacity-10"
          style={{ background: 'radial-gradient(circle, #E63946, transparent 70%)' }} />
      </div>

      <div className="w-full max-w-md relative z-10 animate-fade-in-up">
        {/* Cabecera Lujosa */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-6 relative"
            style={{
              background: 'radial-gradient(circle, rgba(212, 175, 55, 0.12) 0%, rgba(212, 175, 55, 0.02) 100%)',
              border: '1px solid rgba(212, 175, 55, 0.25)',
              boxShadow: '0 0 20px rgba(212, 175, 55, 0.05)',
            }}>
            {/* Anillo de brillo decorativo */}
            <div className="absolute inset-1 rounded-full border border-gold/10 animate-pulse" />
            <Crown className="w-9 h-9 text-gold filter drop-shadow-[0_2px_5px_rgba(212,175,55,0.4)]" />
          </div>
          
          <h1 className="font-display text-3xl font-light text-text-primary tracking-[0.15em] mb-2 uppercase">
            Mile Almanza
          </h1>
          <div className="h-[1px] w-24 bg-gradient-to-r from-transparent via-gold/40 to-transparent mx-auto mb-3" />
          <p className="text-gold/70 text-xs tracking-[0.25em] uppercase font-medium">
            Estética Profesional · Acceso Admin
          </p>
        </div>

        {/* Tarjeta de Login Glassmorphism */}
        <div className="glass-strong rounded-3xl p-8 relative overflow-hidden"
          style={{
            background: 'linear-gradient(145deg, rgba(20, 20, 25, 0.8) 0%, rgba(10, 10, 12, 0.9) 100%)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
          }}>
          
          {/* Línea dorada de brillo superior en la tarjeta */}
          <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-gold/30 to-transparent" />

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email */}
            <div className="space-y-2">
              <label htmlFor="admin-email" className="block text-xs font-semibold uppercase tracking-wider text-text-secondary">
                Correo Electrónico
              </label>
              <div className="relative group">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted group-focus-within:text-gold transition-colors duration-200" />
                <input
                  id="admin-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ejemplo@estudio.com"
                  required
                  className="w-full pl-11 pr-4 py-3.5 rounded-xl text-text-primary placeholder:text-text-muted/30
                    focus:outline-none focus:ring-1 focus:ring-gold/30 focus:border-gold/40 transition-all duration-200 text-sm"
                  style={{
                    background: 'rgba(15, 15, 18, 0.9)',
                    border: '1px solid rgba(255, 255, 255, 0.07)',
                  }}
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label htmlFor="admin-password" className="block text-xs font-semibold uppercase tracking-wider text-text-secondary">
                Contraseña
              </label>
              <div className="relative group">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted group-focus-within:text-gold transition-colors duration-200" />
                <input
                  id="admin-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="w-full pl-11 pr-12 py-3.5 rounded-xl text-text-primary placeholder:text-text-muted/30
                    focus:outline-none focus:ring-1 focus:ring-gold/30 focus:border-gold/40 transition-all duration-200 text-sm"
                  style={{
                    background: 'rgba(15, 15, 18, 0.9)',
                    border: '1px solid rgba(255, 255, 255, 0.07)',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-gold transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Alerta de Error */}
            {error && (
              <div className="flex items-center gap-2 p-3.5 rounded-xl text-xs"
                style={{
                  background: 'rgba(230, 57, 70, 0.07)',
                  border: '1px solid rgba(230, 57, 70, 0.2)',
                  color: '#E63946',
                }}>
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Botón de Acceso (Luxury Gold) */}
            <button
              type="submit"
              disabled={loading || !email || !password}
              className="w-full py-4 rounded-xl font-bold text-xs uppercase tracking-widest transition-all duration-300
                disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:shadow-none
                shadow-[0_4px_20px_rgba(212,175,55,0.15)] hover:shadow-[0_4px_25px_rgba(212,175,55,0.35)]
                hover:scale-[1.01] active:scale-[0.99] relative overflow-hidden group"
              style={{
                background: 'linear-gradient(135deg, #E5C060 0%, #D4AF37 50%, #A8860A 100%)',
                color: '#070708',
              }}
            >
              {/* Brillo destello en hover */}
              <div className="absolute inset-0 w-[200%] h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 -translate-x-[150%] group-hover:translate-x-[150%] transition-transform duration-1000 ease-out pointer-events-none" />
              
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <svg className="animate-spin w-4 h-4 text-[#070708]" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                    <path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" fill="currentColor" className="opacity-75" />
                  </svg>
                  Procesando...
                </span>
              ) : (
                'Iniciar Sesión'
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-text-muted/60 text-xs mt-8 tracking-wider uppercase">
          Área de Administración Reservada
        </p>
      </div>
    </div>
  );
}
