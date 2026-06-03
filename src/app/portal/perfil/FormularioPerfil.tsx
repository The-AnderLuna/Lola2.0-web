"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  User, 
  Mail, 
  CreditCard, 
  Calendar, 
  Sparkles,   
  LogOut, 
  ArrowLeft, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle,
  Lock
} from "lucide-react";

interface ClienteData {
  id: string;
  nombre: string;
  correo: string;
  cedula: string;
  fechaCumpleanos: string; // ISO string or empty
  telefono: string;
}

interface FormularioPerfilProps {
  cliente: ClienteData;
}

export default function FormularioPerfil({ cliente }: FormularioPerfilProps) {
  const router = useRouter();

  // Form states
  const [nombre, setNombre] = useState(cliente.nombre);
  const [correo, setCorreo] = useState(cliente.correo);
  const [cedula, setCedula] = useState(cliente.cedula);
  const [fechaCumpleanos, setFechaCumpleanos] = useState(
    cliente.fechaCumpleanos ? cliente.fechaCumpleanos.split("T")[0] : ""
  );

  // Status states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Handle Logout
  const handleLogout = async () => {
    try {
      const res = await fetch("/api/auth/logout", { method: "POST" });
      if (res.ok) {
        router.push("/mis-citas");
        router.refresh();
      }
    } catch (err) {
      console.error("Error al cerrar sesión", err);
    }
  };

  // Submit Profile Changes
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const res = await fetch("/api/clientes/actualizar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre,
          correo: correo || null,
          cedula: cedula || null,
          fechaCumpleanos: fechaCumpleanos || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Ocurrió un error al actualizar los datos");
      }

      setSuccess("¡Perfil actualizado con éxito!");
      
      // Refresh router so subsequent navigations load updated server-side values
      router.refresh();
      
      // Clear success notification after 4 seconds
      setTimeout(() => setSuccess(null), 4000);

    } catch (err: any) {
      setError(err.message || "Error de red al guardar los cambios");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col font-inter text-text-primary flex-1 overflow-x-hidden relative">
      {/* Estética Premium: Círculos de luz flotantes */}
      <div className="absolute top-[-10%] left-[-20%] w-[60%] aspect-square rounded-full bg-gold opacity-[0.03] blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-20%] w-[60%] aspect-square rounded-full bg-red-urgency opacity-[0.02] blur-[120px] pointer-events-none" />

      {/* Header Fino */}
      <header className="w-full border-b border-white/5 bg-bg-card/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2 group cursor-pointer" onClick={() => router.push("/portal")}>
            <div className="w-8 h-8 rounded-full border border-gold/30 flex items-center justify-center bg-bg-card shadow-[0_0_10px_rgba(212,175,55,0.08)]">
              <Sparkles className="w-3.5 h-3.5 text-gold" />
            </div>
            <span className="font-display font-bold tracking-[0.12em] text-xs uppercase text-transparent bg-clip-text bg-gradient-to-r from-gold-light via-gold to-gold-dark transition-all duration-300">
              Mile Almanza
            </span>
          </div>

          <nav className="flex items-center gap-6">
            <button 
              onClick={() => router.push("/portal")} 
              className="text-xs tracking-wider uppercase font-semibold text-text-secondary hover:text-text-primary transition-colors pb-1 pt-1"
            >
              Mis Citas
            </button>
            <button 
              onClick={() => router.push("/portal?tab=historial")} 
              className="text-xs tracking-wider uppercase font-semibold text-text-secondary hover:text-text-primary transition-colors pb-1 pt-1"
            >
              Historial de Citas
            </button>
            <button 
              onClick={() => router.push("/portal/perfil")} 
              className="text-xs tracking-wider uppercase font-semibold text-gold border-b-2 border-gold/80 pb-1 pt-1"
            >
              Mi Perfil
            </button>
          </nav>

          <button 
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-xs font-semibold text-text-secondary hover:text-red-urgency transition-colors bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg border border-white/5 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Cerrar Sesión</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow w-full max-w-2xl mx-auto px-4 py-8 z-10 space-y-6">
        
        {/* Navigation / Welcome bar */}
        <div className="flex items-center justify-between mb-4 animate-fade-in-up">
          <button
            onClick={() => router.push("/portal")}
            className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-text-secondary hover:text-gold transition-colors group cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            Volver al Panel
          </button>
          <span className="text-xs font-semibold text-text-secondary">
            ID: <span className="font-mono text-[10px] text-text-muted">{cliente.id.substring(0, 8)}...</span>
          </span>
        </div>

        {/* Title */}
        <div className="space-y-1 animate-fade-in-up [animation-delay:50ms]">
          <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-wide">
            Mi Perfil
          </h2>
          <p className="text-xs sm:text-sm text-text-secondary font-medium">
            Mantén tus datos actualizados para agilizar tu facturación y agendamiento.
          </p>
        </div>

        {/* Alerts for API actions */}
        {error && (
          <div className="p-4 rounded-xl bg-red-urgency/10 border border-red-urgency/20 flex items-start gap-3 animate-scale-in">
            <AlertTriangle className="w-5 h-5 text-red-urgency shrink-0 mt-0.5" />
            <p className="text-xs text-red-urgency font-medium leading-relaxed">{error}</p>
          </div>
        )}

        {success && (
          <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 flex items-start gap-3 animate-scale-in">
            <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
            <p className="text-xs text-green-400 font-medium leading-relaxed">{success}</p>
          </div>
        )}

        {/* Glassmorphic Form Card */}
        <div className="glass-strong rounded-2xl p-6 sm:p-8 border border-white/10 shadow-2xl relative overflow-hidden animate-fade-in-up [animation-delay:100ms]">
          
          <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-gold/30 to-transparent" />

          <form onSubmit={handleSubmit} className="space-y-6">
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              
              {/* INPUT: NOMBRE */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-gold/80" />
                  Nombre Completo
                </label>
                <input
                  type="text"
                  required
                  disabled={loading}
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Tu nombre y apellido"
                  className="w-full bg-bg-base/70 border border-white/10 focus:border-gold/50 rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none transition-colors shadow-inner text-text-primary"
                />
              </div>

              {/* READ-ONLY: TELEFONO */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                  <span>🇨🇴</span>
                  Teléfono (WhatsApp)
                </label>
                <div className="w-full bg-white/[0.02] border border-white/5 rounded-xl px-4 py-3 text-sm font-bold tracking-widest text-text-muted select-none">
                  +57 {cliente.telefono.slice(-10)}
                </div>
                <p className="text-[10px] text-text-muted italic leading-none pl-1">
                  * Cambios de teléfono requieren validación OTP.
                </p>
              </div>

              {/* INPUT: CORREO */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-gold/80" />
                  Correo Electrónico
                </label>
                <input
                  type="email"
                  disabled={loading}
                  value={correo}
                  onChange={(e) => setCorreo(e.target.value)}
                  placeholder="ejemplo@correo.com"
                  className="w-full bg-bg-base/70 border border-white/10 focus:border-gold/50 rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none transition-colors shadow-inner text-text-primary"
                />
              </div>

              {/* INPUT: CEDULA */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-gold/80" />
                  Documento (Cédula)
                </label>
                <input
                  type="text"
                  disabled={loading}
                  value={cedula}
                  onChange={(e) => setCedula(e.target.value)}
                  placeholder="1.000.000.000"
                  className="w-full bg-bg-base/70 border border-white/10 focus:border-gold/50 rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none transition-colors shadow-inner text-text-primary"
                />
              </div>

              {/* INPUT: CUMPLEAÑOS */}
              <div className="space-y-2 sm:col-span-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-gold/80" />
                  Fecha de Cumpleaños
                </label>
                <div className="relative">
                  <input
                    type="date"
                    disabled={loading}
                    value={fechaCumpleanos}
                    onChange={(e) => setFechaCumpleanos(e.target.value)}
                    className="w-full bg-bg-base/70 border border-white/10 focus:border-gold/50 rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none transition-colors shadow-inner text-text-primary dark:color-scheme-dark"
                  />
                </div>
              </div>

            </div>

            {/* Premium Notice Box */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              
              <div className="p-3.5 rounded-xl bg-gold/5 border border-gold/10 flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-gold shrink-0 mt-0.5" />
                <div>
                  <div className="text-[10px] uppercase font-bold tracking-wider text-gold mb-0.5">Beneficio Especial</div>
                  <p className="text-[11px] text-text-secondary leading-relaxed font-medium">
                    ¡Registra tu fecha de cumpleaños! Queremos consentirte con obsequios sorpresas y abonos especiales en tu día.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-white/[0.01] border border-white/5 flex items-start gap-2.5">
                <Lock className="w-4 h-4 text-text-secondary shrink-0 mt-0.5" />
                <div>
                  <div className="text-[10px] uppercase font-bold tracking-wider text-text-secondary mb-0.5">Seguridad Absoluta</div>
                  <p className="text-[11px] text-text-muted leading-relaxed">
                    Tus datos se gestionan bajo altos estándares de confidencialidad, cifrados en la base de datos de Lola 2.0.
                  </p>
                </div>
              </div>

            </div>

            {/* Submit Button */}
            <div className="pt-4 border-t border-white/5 flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="w-full sm:w-auto bg-gradient-to-r from-gold-dark via-gold to-gold-light hover:brightness-110 active:scale-[0.98] disabled:opacity-40 text-black font-bold uppercase tracking-wider text-xs py-3.5 px-8 rounded-xl transition-all duration-300 cursor-pointer shadow-[0_4px_15px_rgba(212,175,55,0.2)]"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-1.5">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-black" />
                    Guardando Cambios...
                  </span>
                ) : (
                  "Guardar Cambios"
                )}
              </button>
            </div>

          </form>

        </div>

      </main>

      {/* Footer Fino */}
      <footer className="w-full max-w-5xl mx-auto py-8 text-center text-xs text-text-muted border-t border-white/5 z-10 flex flex-col sm:flex-row justify-between items-center gap-4 mt-auto">
        <div>
          © {new Date().getFullYear()} Mile Almanza Estética. Todos los derechos reservados.
        </div>
        <div className="flex gap-4">
          <span className="hover:text-text-secondary transition-colors cursor-pointer">Términos</span>
          <span>•</span>
          <span className="hover:text-text-secondary transition-colors cursor-pointer">Privacidad</span>
        </div>
      </footer>
    </div>
  );
}
