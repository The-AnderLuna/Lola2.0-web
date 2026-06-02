"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Calendar, 
  Clock, 
  User, 
  MapPin, 
  AlertCircle, 
  ChevronDown, 
  ChevronUp, 
  MessageSquare, 
  Trash2, 
  LogOut, 
  CheckCircle,
  HelpCircle,
  XCircle,
  Activity,
  DollarSign,
  ShieldAlert
} from "lucide-react";

interface ClienteData {
  id: string;
  nombre: string;
  telefono: string;
}

export interface CitaData {
  id: string;
  clienteId: string;
  servicioId: string;
  servicioNombre: string;
  profesionalId: string;
  profesionalNombre: string;
  fechaHoraInicio: string;
  fechaHoraFin: string;
  duracionMin: number;
  precioTotal: number;
  estado: string;
  expiresAt: string | null;
  grupoId?: string | null;
  reservaTitularId?: string | null;
  clienteNombre?: string;
  titularNombre?: string | null;
  notas?: string | null;
  subServicios?: { clienteNombre: string; servicioNombre: string; }[]; // Para agrupaciones
}

interface DashboardProps {
  cliente: ClienteData;
  citasIniciales: CitaData[];
}

export default function DashboardCliente({ cliente, citasIniciales }: DashboardProps) {
  const router = useRouter();
  const [citas, setCitas] = useState<CitaData[]>(citasIniciales);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"activas" | "historial">("activas");
  const [filtroEstado, setFiltroEstado] = useState<string>("TODOS");

  // Logout action
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

  // Autonomous Cancellation for PRE_AGENDADA
  const handleCancelAppointment = async (citaId: string) => {
    if (!confirm("¿Estás segura de que deseas cancelar esta reserva temporal? Liberarás el cupo inmediatamente.")) {
      return;
    }

    setLoadingAction(citaId);
    setActionError(null);
    setActionSuccess(null);

    try {
      const res = await fetch("/api/citas/cancelar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ citaId }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "No se pudo cancelar la cita");
      }

      // Optimistically update the UI: change state to CANCELADA
      // Note: Now we also need to update other appointments in the same group if applicable
      const canceledCita = citas.find(c => c.id === citaId);
      
      setCitas(prevCitas => 
        prevCitas.map(cita => {
          if (cita.id === citaId || (canceledCita?.grupoId && cita.grupoId === canceledCita.grupoId)) {
            return { ...cita, estado: "CANCELADA", expiresAt: null };
          }
          return cita;
        })
      );

      setActionSuccess("Tu reserva ha sido cancelada con éxito y el cupo ha sido liberado.");

      // Clear success alert after 5 seconds
      setTimeout(() => setActionSuccess(null), 5000);

    } catch (err: any) {
      setActionError(err.message || "Error al cancelar la cita");
    } finally {
      setLoadingAction(null);
    }
  };

  // Helper: Format Date beautifully in Spanish
  const formatFriendlyDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("es-ES", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  // Helper: Format Time beautifully
  const formatFriendlyTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).replace(/\u202f|\u00a0/g, ' ');
  };

  const capitalizeFirst = (str: string) => {
    if (!str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  };

  // Separar citas activas e historial
  // Activa = No cancelada ni completada ni no asistio, y en el futuro
  const now = new Date();
  
  const citasActivas = citas.filter(cita => {
    const inPast = new Date(cita.fechaHoraInicio) < now;
    const isInactiveState = ["CANCELADA", "CANCELADA_SISTEMA", "COMPLETADA", "NO_ASISTIO"].includes(cita.estado);
    return !isInactiveState && !inPast;
  });

  const citasHistorial = citas.filter(cita => {
    const inPast = new Date(cita.fechaHoraInicio) < now;
    const isInactiveState = ["CANCELADA", "CANCELADA_SISTEMA", "COMPLETADA", "NO_ASISTIO"].includes(cita.estado);
    return isInactiveState || inPast;
  });

  // Elegir la cita activa principal (la más próxima en fecha)
  const citaActivaRaw = citasActivas.length > 0 
    ? [...citasActivas].sort((a, b) => new Date(a.fechaHoraInicio).getTime() - new Date(b.fechaHoraInicio).getTime())[0] 
    : null;

  // Agrupar si es PRE_AGENDADA y tiene grupo
  let serviciosAgrupados: CitaData[] = [];
  let citaActivaPrincipal: CitaData | null = null;

  if (citaActivaRaw) {
    if (citaActivaRaw.grupoId) {
      serviciosAgrupados = citasActivas
        .filter(c => c.grupoId === citaActivaRaw.grupoId)
        .sort((a, b) => new Date(a.fechaHoraInicio).getTime() - new Date(b.fechaHoraInicio).getTime());
      
      const endTimeMax = new Date(Math.max(...serviciosAgrupados.map(c => new Date(c.fechaHoraFin).getTime())));
      
      const citaBase = { ...serviciosAgrupados[0] };
      citaActivaPrincipal = {
        ...citaBase,
        servicioNombre: serviciosAgrupados.length > 1 ? "Reserva Compartida" : citaBase.servicioNombre,
        fechaHoraFin: endTimeMax.toISOString(),
        duracionMin: serviciosAgrupados.reduce((acc, c) => acc + c.duracionMin, 0),
        precioTotal: serviciosAgrupados.reduce((acc, c) => acc + c.precioTotal, 0),
        subServicios: serviciosAgrupados.length > 1 ? serviciosAgrupados.map(s => ({ clienteNombre: s.clienteNombre || "Cliente", servicioNombre: s.servicioNombre })) : undefined
      };
    } else {
      serviciosAgrupados = [citaActivaRaw];
      citaActivaPrincipal = citaActivaRaw;
    }
  }

  // Otras citas futuras (excluyendo todas las que están en el grupo de la activa principal)
  const idsAgrupados = serviciosAgrupados.map(s => s.id);
  const otrasCitasActivasRaw = citasActivas.filter(c => !idsAgrupados.includes(c.id));

  // Group otrasCitasActivasRaw by grupoId
  const otrasCitasAgrupadas: CitaData[] = [];
  const gruposProcesados = new Set<string>();

  otrasCitasActivasRaw.forEach(cita => {
    if (cita.grupoId) {
      if (!gruposProcesados.has(cita.grupoId)) {
        gruposProcesados.add(cita.grupoId);
        const grupo = otrasCitasActivasRaw.filter(c => c.grupoId === cita.grupoId);
        const endTimeMax = new Date(Math.max(...grupo.map(c => new Date(c.fechaHoraFin).getTime())));
        
        // Clonamos la primera cita del grupo para usarla como base
        const citaBase = { ...cita };
        
        otrasCitasAgrupadas.push({
          ...citaBase,
          servicioNombre: grupo.length > 1 ? "Reserva Compartida" : citaBase.servicioNombre,
          fechaHoraFin: endTimeMax.toISOString(),
          duracionMin: grupo.reduce((acc, c) => acc + c.duracionMin, 0),
          precioTotal: grupo.reduce((acc, c) => acc + c.precioTotal, 0),
          subServicios: grupo.length > 1 ? grupo.map(s => ({ clienteNombre: s.clienteNombre || "Cliente", servicioNombre: s.servicioNombre })) : undefined
        });
      }
    } else {
      otrasCitasAgrupadas.push(cita);
    }
  });

  // Helper: Format currency
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(val);
  };

  // Helper: Extraer abono
  const getAbonoRequerido = (cita: CitaData) => {
    if (cita.estado !== "PRE_AGENDADA" || !cita.notas) return null;
    const match = cita.notas.match(/\$([\d,.]+)/);
    if (match) {
      const numStr = match[1].replace(/[.,]/g, '');
      const num = parseInt(numStr, 10);
      if (!isNaN(num)) return num;
    }
    return null;
  };

  // Helper: Get Badge colors based on booking state
  const getBadgeConfig = (estado: string) => {
    switch (estado) {
      case "CONFIRMADA":
        return {
          text: "Confirmada",
          styles: "bg-gold/10 text-gold border-gold/30 shadow-[0_0_10px_rgba(212,175,55,0.1)]",
          icon: <CheckCircle className="w-3.5 h-3.5" />
        };
      case "EN_REVISION":
        return {
          text: "En Revisión",
          styles: "bg-amber-500/10 text-amber-400 border-amber-500/20",
          icon: <Activity className="w-3.5 h-3.5 animate-pulse" />
        };
      case "PRE_AGENDADA":
        return {
          text: "Cupo Temporal",
          styles: "bg-white/5 text-text-primary border-white/10",
          icon: <Clock className="w-3.5 h-3.5" />
        };
      case "REAGENDADA":
        return {
          text: "Reagendada",
          styles: "bg-blue-500/10 text-blue-400 border-blue-500/20",
          icon: <Calendar className="w-3.5 h-3.5" />
        };
      case "COMPLETADA":
        return {
          text: "Completada",
          styles: "bg-green-500/10 text-green-400 border-green-500/20",
          icon: <CheckCircle className="w-3.5 h-3.5" />
        };
      case "CANCELADA":
      case "CANCELADA_SISTEMA":
        return {
          text: "Cancelada",
          styles: "bg-white/5 text-text-muted border-white/5",
          icon: <XCircle className="w-3.5 h-3.5" />
        };
      case "NO_ASISTIO":
        return {
          text: "Inasistencia",
          styles: "bg-red-urgency/10 text-red-urgency border-red-urgency/20",
          icon: <AlertCircle className="w-3.5 h-3.5" />
        };
      default:
        return {
          text: estado,
          styles: "bg-white/5 text-text-secondary border-white/10",
          icon: <HelpCircle className="w-3.5 h-3.5" />
        };
    }
  };

  // Helper: Get dynamic WhatsApp contact link
  const getWhatsAppLink = (cita: CitaData, actionType: "cambio" | "cancelacion" | "confirmacion") => {
    const formattedDate = formatFriendlyDate(cita.fechaHoraInicio);
    const formattedTime = formatFriendlyTime(cita.fechaHoraInicio);
    let text = '';
    if (actionType === "cambio") {
      text = `Hola Mile Almanza Estética, soy ${cliente.nombre}. Quisiera solicitar un cambio de fecha/hora para mi cita de *${cita.servicioNombre}* programada para el *${formattedDate}* a las *${formattedTime}*. ¿Qué disponibilidad tienen?`;
    } else if (actionType === "cancelacion") {
      text = `Hola Mile Almanza Estética, soy ${cliente.nombre}. Quisiera solicitar la cancelación de mi cita de *${cita.servicioNombre}* programada para el *${formattedDate}* a las *${formattedTime}*. Muchas gracias.`;
    } else {
      text = `Hola Mile Almanza Estética, soy ${cliente.nombre}. Adjunto el comprobante de pago para mi cita de *${cita.servicioNombre}* programada para el *${formattedDate}* a las *${formattedTime}*. (ID: ${cita.id})`;
    }
    
    return `https://wa.me/573138865616?text=${encodeURIComponent(text)}`;
  };

  // Helper: Renderize Actions based on business rules
  const renderActions = (cita: CitaData, isPrimary: boolean) => {
    const btnClass = isPrimary 
      ? "flex-1 bg-white/5 border border-white/10 text-xs py-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 font-bold uppercase tracking-wider"
      : "bg-white/5 border border-white/5 hover:border-gold/30 hover:bg-gold/5 text-gold font-semibold text-[10px] px-3.5 py-1.5 rounded-lg transition-all text-center flex items-center gap-1.5";

    if (cita.estado === "PRE_AGENDADA") {
      const isAmiga = cita.reservaTitularId && cita.reservaTitularId !== cliente.id;
      
      if (isAmiga) {
        return (
          <div className="flex-1 bg-white/5 border border-white/5 px-4 py-3 rounded-xl text-center">
            <span className="text-text-muted text-xs block text-balance">
              El pago y gestión de este cupo temporal está a cargo de <strong className="text-white">{cita.titularNombre || 'Titular'}</strong>. Comunícate con él/ella para el abono respectivo.
            </span>
          </div>
        );
      }

      return (
        <>
          <a
            href={getWhatsAppLink(cita, "confirmacion")}
            target="_blank"
            rel="noopener noreferrer"
            className={isPrimary 
              ? "flex-1 bg-gradient-to-r from-gold-dark to-gold text-black font-bold uppercase tracking-wider text-xs py-3 rounded-xl cursor-pointer hover:brightness-110 text-center transition-all duration-300 block"
              : "bg-gold hover:brightness-110 text-black font-semibold text-[10px] uppercase tracking-wider px-3.5 py-1.5 rounded-lg transition-all shadow-[0_2px_10px_rgba(212,175,55,0.2)] inline-block"
            }
          >
            Confirmar Pago
          </a>
          <button
            onClick={() => handleCancelAppointment(cita.id)}
            disabled={loadingAction === cita.id}
            className={isPrimary
              ? "flex-1 bg-white/5 border border-white/10 hover:bg-red-urgency/10 hover:border-red-urgency/30 text-text-secondary hover:text-red-urgency font-bold uppercase tracking-wider text-xs py-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
              : "p-1.5 hover:bg-red-urgency/10 text-text-muted hover:text-red-urgency rounded-lg border border-transparent transition-all"
            }
          >
            {loadingAction === cita.id ? (
              <span className={isPrimary ? "" : "px-2 text-[10px] uppercase"}>Liberando...</span>
            ) : (
              <>
                <Trash2 className={isPrimary ? "w-3.5 h-3.5" : "w-4 h-4"} />
                {isPrimary && "Liberar cupo"}
              </>
            )}
          </button>
        </>
      );
    }

    if (cita.estado === "EN_REVISION") {
      return (
        <div className={`w-full flex items-center justify-center gap-2 text-amber-400/80 bg-amber-500/5 rounded-xl border border-amber-500/10 ${isPrimary ? 'p-3 text-xs' : 'p-2 text-[10px]'}`}>
          <ShieldAlert className={isPrimary ? "w-4 h-4" : "w-3 h-3"} />
          <span>Pago en revisión. Modificaciones bloqueadas temporalmente.</span>
        </div>
      );
    }

    if (cita.estado === "CONFIRMADA" || cita.estado === "REAGENDADA") {
      const horasRestantes = (new Date(cita.fechaHoraInicio).getTime() - now.getTime()) / (1000 * 60 * 60);
      
      if (horasRestantes > 12) {
        return (
          <a
            href={getWhatsAppLink(cita, "cambio")}
            target="_blank"
            rel="noopener noreferrer"
            className={`${btnClass} hover:border-gold/30 text-gold hover:bg-gold/5`}
          >
            <MessageSquare className={isPrimary ? "w-4 h-4" : "w-3.5 h-3.5"} />
            Reprogramar Cita
          </a>
        );
      } else {
        return (
          <div className={`w-full flex items-center justify-center gap-2 text-text-muted bg-white/5 rounded-xl border border-white/5 ${isPrimary ? 'p-3 text-xs' : 'p-2 text-[10px]'}`}>
            <AlertCircle className={isPrimary ? "w-4 h-4" : "w-3 h-3"} />
            <span>Faltan menos de 12h. No se permiten reprogramaciones.</span>
          </div>
        );
      }
    }

    return null;
  };

  return (
    <div className="min-h-screen flex flex-col font-inter text-text-primary flex-1">
      {/* Estética Premium: Círculos de luz flotantes */}
      <div className="absolute top-[-10%] left-[-20%] w-[60%] aspect-square rounded-full bg-gold opacity-[0.03] blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-20%] w-[60%] aspect-square rounded-full bg-red-urgency opacity-[0.02] blur-[120px] pointer-events-none" />

      {/* Header Fino */}
      <header className="w-full border-b border-white/5 bg-bg-card/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2 group cursor-pointer" onClick={() => router.push("/")}>
            <span className="font-display font-bold tracking-[0.12em] text-xs uppercase text-transparent bg-clip-text bg-gradient-to-r from-gold-light via-gold to-gold-dark transition-all duration-300">
              Mile Almanza
            </span>
          </div>

          <nav className="flex items-center gap-6">
            <button 
              onClick={() => setActiveTab("activas")} 
              className={`text-xs tracking-wider uppercase font-semibold pb-1 pt-1 transition-colors ${activeTab === "activas" ? "text-gold border-b-2 border-gold/80" : "text-text-secondary hover:text-text-primary"}`}
            >
              Mis Citas
            </button>
            <button 
              onClick={() => setActiveTab("historial")} 
              className={`text-xs tracking-wider uppercase font-semibold pb-1 pt-1 transition-colors ${activeTab === "historial" ? "text-gold border-b-2 border-gold/80" : "text-text-secondary hover:text-text-primary"}`}
            >
              Historial de Citas
            </button>
            <button 
              onClick={() => router.push("/portal/perfil")} 
              className="text-xs tracking-wider uppercase font-semibold text-text-secondary hover:text-text-primary transition-colors pb-1 pt-1"
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
      <main className="flex-grow w-full max-w-3xl mx-auto px-4 py-8 z-10 space-y-8">
        
        {/* Welcome Block */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 animate-fade-in-up">
          <div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-wide">
              Hola, <span className="text-transparent bg-clip-text bg-gradient-to-r from-gold-light via-gold to-gold-dark">{capitalizeFirst(cliente.nombre.split(" ")[0])}</span>
            </h2>
            <p className="text-xs sm:text-sm text-text-secondary mt-1 font-medium">
              Consulta y gestiona el estado de tus reservas de forma segura.
            </p>
          </div>
          <button
            onClick={() => router.push("/reservar")}
            className="bg-gradient-to-r from-gold-dark to-gold text-black font-bold uppercase tracking-wider text-xs px-5 py-2.5 rounded-xl cursor-pointer hover:brightness-110 transition-all duration-300 shadow-[0_4px_15px_rgba(212,175,55,0.2)] active:scale-[0.98]"
          >
            Agendar Nueva Cita
          </button>
        </div>

        {/* Alerts for API actions */}
        {actionError && (
          <div className="p-4 rounded-xl bg-red-urgency/10 border border-red-urgency/20 flex items-start gap-3 animate-scale-in">
            <AlertCircle className="w-5 h-5 text-red-urgency shrink-0 mt-0.5" />
            <p className="text-xs text-red-urgency font-medium leading-relaxed">{actionError}</p>
          </div>
        )}

        {actionSuccess && (
          <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 flex items-start gap-3 animate-scale-in">
            <CheckCircle className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
            <p className="text-xs text-green-400 font-medium leading-relaxed">{actionSuccess}</p>
          </div>
        )}

        {/* SECTION A: CITA ACTIVA DESTACADA */}
        {activeTab === "activas" && (
          <div className="space-y-8">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
              Cita Principal
            </h3>

            {citaActivaPrincipal ? (
              <div className="glass-strong rounded-2xl p-6 relative overflow-hidden border border-gold/25 shadow-2xl transition-all duration-300 hover:border-gold/40">
                
                {/* Gold light sheen behind status */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-gold/5 rounded-bl-full blur-2xl pointer-events-none" />

                {/* Status Header */}
                <div className="flex justify-between items-start gap-4 mb-5 pb-4 border-b border-white/5">
                  <div className="space-y-1">
                    <div className="text-[10px] uppercase tracking-widest text-text-muted font-bold">
                      {citaActivaPrincipal.subServicios ? "Paquete de Servicios" : "Servicio"}
                    </div>
                    <h4 className="text-xl font-bold tracking-wide font-display text-text-primary">
                      {citaActivaPrincipal.servicioNombre}
                    </h4>
                    {citaActivaPrincipal.subServicios && (
                      <div className="text-xs text-text-secondary mt-2 flex flex-col gap-2">
                        {Object.entries(
                          citaActivaPrincipal.subServicios.reduce((acc, sub) => {
                            if (!acc[sub.clienteNombre]) acc[sub.clienteNombre] = [];
                            acc[sub.clienteNombre].push(sub.servicioNombre);
                            return acc;
                          }, {} as Record<string, string[]>)
                        ).map(([nombre, servicios]) => (
                          <div key={nombre} className="flex flex-col border-l-2 border-gold/30 pl-2">
                            <span className="font-semibold text-gold/80 mb-0.5">{nombre === cliente.nombre ? "Tus citas" : `Citas de ${nombre}`}</span>
                            {servicios.map((s, idx) => (
                              <span key={idx} className="pl-2 relative before:content-['•'] before:absolute before:left-0 before:text-text-muted">{s}</span>
                            ))}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {(() => {
                    const config = getBadgeConfig(citaActivaPrincipal.estado);
                    return (
                      <span className={`flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-bold px-3 py-1.5 rounded-full border ${config.styles}`}>
                        {config.icon}
                        {config.text}
                      </span>
                    );
                  })()}
                </div>

                {/* Countdown Component (Only for PRE_AGENDADA) */}
                {citaActivaPrincipal.estado === "PRE_AGENDADA" && citaActivaPrincipal.expiresAt && (
                  <CountdownBanner 
                    expiresAtStr={citaActivaPrincipal.expiresAt} 
                    onExpire={() => {
                      // Update state to CANCELADA_SISTEMA if countdown finishes
                      setCitas(prevCitas => 
                        prevCitas.map(cita => 
                          cita.id === citaActivaPrincipal!.id ? { ...cita, estado: "CANCELADA_SISTEMA", expiresAt: null } : cita
                        )
                      );
                    }}
                  />
                )}

                {/* Detail list grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
                  
                  <div className="flex items-center gap-3 bg-white/[0.02] p-3 rounded-xl border border-white/5 transition-colors hover:bg-white/[0.04]">
                    <div className="w-8 h-8 rounded-full bg-gold/10 flex items-center justify-center shrink-0">
                      <Calendar className="w-4 h-4 text-gold" />
                    </div>
                    <div>
                      <div className="text-[10px] uppercase font-semibold text-text-muted">Fecha</div>
                      <div className="font-semibold text-text-primary text-xs capitalize">
                        {formatFriendlyDate(citaActivaPrincipal.fechaHoraInicio)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 bg-white/[0.02] p-3 rounded-xl border border-white/5 transition-colors hover:bg-white/[0.04]">
                    <div className="w-8 h-8 rounded-full bg-gold/10 flex items-center justify-center shrink-0">
                      <Clock className="w-4 h-4 text-gold" />
                    </div>
                    <div>
                      <div className="text-[10px] uppercase font-semibold text-text-muted">Horario</div>
                      <div className="font-semibold text-text-primary text-xs">
                        {formatFriendlyTime(citaActivaPrincipal.fechaHoraInicio)} - {formatFriendlyTime(citaActivaPrincipal.fechaHoraFin)}
                        <span className="text-[10px] text-text-secondary font-medium ml-1">({citaActivaPrincipal.duracionMin} min)</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 bg-white/[0.02] p-3 rounded-xl border border-white/5 transition-colors hover:bg-white/[0.04]">
                    <div className="w-8 h-8 rounded-full bg-gold/10 flex items-center justify-center shrink-0">
                      <User className="w-4 h-4 text-gold" />
                    </div>
                    <div>
                      <div className="text-[10px] uppercase font-semibold text-text-muted">Especialista</div>
                      <div className="font-semibold text-text-primary text-xs">
                        {citaActivaPrincipal.profesionalNombre}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 bg-white/[0.02] p-3 rounded-xl border border-white/5 transition-colors hover:bg-white/[0.04]">
                    <div className="w-8 h-8 rounded-full bg-gold/10 flex items-center justify-center shrink-0">
                      <DollarSign className="w-4 h-4 text-gold" />
                    </div>
                    <div>
                      {(() => {
                        const abonoReq = getAbonoRequerido(citaActivaPrincipal);
                        return abonoReq ? (
                          <>
                            <div className="text-[10px] uppercase font-semibold text-text-muted">Abono Requerido</div>
                            <div className="font-semibold text-gold text-xs leading-tight">
                              {formatCurrency(abonoReq)}
                            </div>
                            <div className="text-[9px] text-text-muted">
                              Total: {formatCurrency(citaActivaPrincipal.precioTotal)}
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="text-[10px] uppercase font-semibold text-text-muted">Inversión</div>
                            <div className="font-semibold text-text-primary text-xs">
                              {formatCurrency(citaActivaPrincipal.precioTotal)}
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>

                </div>

                {/* Actions Box */}
                <div className="pt-4 border-t border-white/5 flex flex-col sm:flex-row gap-3">
                  {renderActions(citaActivaPrincipal, true)}
                </div>

              </div>
            ) : (
              <div className="glass rounded-2xl p-8 text-center border border-white/5 shadow-xl relative overflow-hidden">
                <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4 border border-white/5">
                  <Calendar className="w-5 h-5 text-text-secondary" />
                </div>
                <h4 className="font-display font-bold text-base text-text-primary mb-1">
                  No tienes citas programadas
                </h4>
                <p className="text-xs text-text-secondary max-w-xs mx-auto leading-relaxed mb-5">
                  Resalta tu belleza agendando una experiencia de micropigmentación o estética facial premium.
                </p>
                <button
                  onClick={() => router.push("/reservar")}
                  className="bg-white/5 hover:bg-gold/10 hover:text-gold border border-white/10 hover:border-gold/30 text-text-primary text-xs font-bold uppercase tracking-wider px-5 py-2.5 rounded-xl transition-all duration-300 cursor-pointer"
                >
                  Agendar Experiencia
                </button>
              </div>
            )}
          </div>
        )}

        {/* OTRAS CITAS FUTURAS SI LAS HUBIERA */}
        {activeTab === "activas" && otrasCitasAgrupadas.length > 0 && (
          <div className="space-y-4 animate-fade-in-up [animation-delay:200ms]">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
              Otras Reservas
            </h3>
            <div className="space-y-3">
              {otrasCitasAgrupadas.map(cita => (
                <div key={cita.id} className="glass rounded-xl p-4.5 border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-gold/20 transition-all">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm tracking-wide text-text-primary">{cita.servicioNombre}</span>
                      {(() => {
                        const config = getBadgeConfig(cita.estado);
                        return (
                          <span className={`text-[9px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full border ${config.styles}`}>
                            {config.text}
                          </span>
                        );
                      })()}
                    </div>
                      {cita.subServicios && (
                        <div className="text-[11px] text-text-secondary mt-2 mb-1 flex flex-col gap-2">
                          {Object.entries(
                            cita.subServicios.reduce((acc, sub) => {
                              if (!acc[sub.clienteNombre]) acc[sub.clienteNombre] = [];
                              acc[sub.clienteNombre].push(sub.servicioNombre);
                              return acc;
                            }, {} as Record<string, string[]>)
                          ).map(([nombre, servicios]) => (
                            <div key={nombre} className="flex flex-col border-l-2 border-gold/30 pl-2">
                              <span className="font-semibold text-gold/80 mb-0.5">{nombre === cliente.nombre ? "Tus citas" : `Citas de ${nombre}`}</span>
                              {servicios.map((s, idx) => (
                                <span key={idx} className="pl-2 relative before:content-['•'] before:absolute before:left-0 before:text-text-muted">{s}</span>
                              ))}
                            </div>
                          ))}
                        </div>
                      )}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-secondary mt-1">
                      <span className="capitalize">{formatFriendlyDate(cita.fechaHoraInicio).split(",")[1]}</span>
                      <span>•</span>
                      <span>{formatFriendlyTime(cita.fechaHoraInicio)}</span>
                      <span>•</span>
                      <span className="font-medium text-text-muted">{cita.profesionalNombre}</span>
                    </div>
                  </div>

                  <div className="flex gap-2 w-full md:w-auto mt-2 md:mt-0 md:pl-4 md:border-l border-white/5">
                    {renderActions(cita, false)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SECTION B: HISTORIAL DE CITAS */}
        {activeTab === "historial" && (
          <div className="space-y-4 animate-fade-in-up">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 border-b border-white/5 pb-4">
              <h2 className="text-xs uppercase tracking-widest text-text-muted font-bold flex items-center gap-2">
                Historial de Visitas
                <span className="bg-white/5 border border-white/5 text-text-muted px-2 py-0.5 rounded-full font-bold">
                  {citasHistorial.length}
                </span>
              </h2>
              <select
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
                className="bg-bg-card border border-white/10 rounded-lg text-xs px-3 py-2 text-text-primary outline-none focus:border-gold/50 cursor-pointer"
              >
                <option value="TODOS">Todos los estados</option>
                <option value="COMPLETADA">Completada</option>
                <option value="CANCELADA_CLIENTE">Cancelada por Cliente</option>
                <option value="CANCELADA_SISTEMA">Cancelada por Sistema</option>
                <option value="NO_ASISTIO">No Asistió</option>
              </select>
            </div>
            
            <div className="space-y-3">
              {citasHistorial.filter(c => filtroEstado === "TODOS" || c.estado === filtroEstado).length > 0 ? (
                [...citasHistorial]
                  .filter(c => filtroEstado === "TODOS" || c.estado === filtroEstado)
                  .sort((a, b) => new Date(b.fechaHoraInicio).getTime() - new Date(a.fechaHoraInicio).getTime())
                  .map(cita => {
                    const badge = getBadgeConfig(cita.estado);
                    return (
                      <div key={cita.id} className="glass rounded-xl p-4 border border-white/5 flex items-center justify-between gap-4 hover:border-white/10 transition-colors">
                        <div className="space-y-1">
                          <h5 className="font-semibold text-xs text-text-primary tracking-wide">
                            {cita.servicioNombre}
                          </h5>
                          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-text-secondary">
                            <span className="capitalize">{formatFriendlyDate(cita.fechaHoraInicio).split(",")[1]}</span>
                            <span>•</span>
                            <span>{formatFriendlyTime(cita.fechaHoraInicio)}</span>
                            <span>•</span>
                            <span className="text-text-muted">{cita.profesionalNombre}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-semibold text-text-secondary">
                            {formatCurrency(cita.precioTotal)}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badge.styles}`}>
                            {badge.text}
                          </span>
                        </div>
                      </div>
                    );
                  })
              ) : (
                <div className="text-center py-10 bg-white/[0.02] rounded-xl border border-white/5">
                  <p className="text-xs text-text-muted">
                    No hay citas que coincidan con este filtro.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Footer Fino */}
      <footer className="w-full max-w-5xl mx-auto py-8 text-center text-xs text-text-muted border-t border-white/5 z-10 flex flex-col sm:flex-row justify-between items-center gap-4 px-4 mt-auto">
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

/* ─────────────────────────────────────────────────────────────────────────────
   SUB-COMPONENT: COUNTDOWN BANNER (Handles live timer ticks)
   ───────────────────────────────────────────────────────────────────────────── */
interface CountdownProps {
  expiresAtStr: string;
  onExpire: () => void;
}

function CountdownBanner({ expiresAtStr, onExpire }: CountdownProps) {
  const [timeLeft, setTimeLeft] = useState<number>(0);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const expires = new Date(expiresAtStr).getTime();
      const difference = expires - Date.now();
      return difference > 0 ? Math.floor(difference / 1000) : 0;
    };

    setTimeLeft(calculateTimeLeft());

    const interval = setInterval(() => {
      const remaining = calculateTimeLeft();
      setTimeLeft(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
        onExpire();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAtStr, onExpire]);

  // Format seconds to MM:SS
  const formatTime = (totalSeconds: number) => {
    const min = Math.floor(totalSeconds / 60);
    const sec = totalSeconds % 60;
    return `${min.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  if (timeLeft <= 0) {
    return (
      <div className="mb-5 p-3 rounded-xl bg-red-urgency/10 border border-red-urgency/20 text-center flex items-center justify-center gap-2 animate-pulse">
        <AlertCircle className="w-4 h-4 text-red-urgency" />
        <span className="text-xs font-semibold text-red-urgency">Esta pre-reserva ha expirado.</span>
      </div>
    );
  }

  return (
    <div className="mb-5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-between gap-3 animate-scale-in">
      <div className="flex items-center gap-2">
        <Clock className="w-4.5 h-4.5 text-amber-400 shrink-0 animate-pulse" />
        <span className="text-xs font-medium text-amber-300">
          Tu cupo temporal expira pronto. Completa tu abono para asegurar tu cita.
        </span>
      </div>
      <div className="bg-bg-base/80 border border-amber-500/30 px-3 py-1 rounded-lg">
        <span className="font-mono text-sm font-bold text-amber-400">
          {formatTime(timeLeft)}
        </span>
      </div>
    </div>
  );
}
