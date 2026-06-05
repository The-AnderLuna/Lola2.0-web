"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
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
  ShieldAlert,
  FileText
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
  metodoPago?: string | null;
  createdAt?: string | null;
  subServicios?: { clienteNombre: string; servicioNombre: string; }[]; // Para agrupaciones
}

interface DashboardProps {
  cliente: ClienteData;
  whatsappNumero: string;
  nequiNumero?: string;
  daviplataNumero?: string;
  titularCuenta?: string;
  citasIniciales: CitaData[];
}

export default function DashboardCliente({ 
  cliente, 
  whatsappNumero, 
  nequiNumero = "",
  daviplataNumero = "",
  titularCuenta = "",
  citasIniciales 
}: DashboardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [citas, setCitas] = useState<CitaData[]>(citasIniciales);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  // Leer tab inicial desde la URL (?tab=historial)
  const tabFromUrl = (): "activas" | "historial" => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get("tab") === "historial" ? "historial" : "activas";
    }
    return searchParams.get("tab") === "historial" ? "historial" : "activas";
  };

  const [activeTab, setActiveTab] = useState<"activas" | "historial">(tabFromUrl);
  const [filtroEstado, setFiltroEstado] = useState<string>("TODOS");
  const [showCancelModal, setShowCancelModal] = useState<string | null>(null);
  
  const [showReprogramarModal, setShowReprogramarModal] = useState<CitaData | null>(null);
  const [reprogramarFecha, setReprogramarFecha] = useState("");
  const [reprogramarHora, setReprogramarHora] = useState("");
  const [reprogramarMotivo, setReprogramarMotivo] = useState("");

  const [showConfirmarPagoModal, setShowConfirmarPagoModal] = useState<CitaData | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>("");

  const [showRetryFailedModal, setShowRetryFailedModal] = useState<{ citaBase: CitaData; grupo: CitaData[]; error: string } | null>(null);
  const [hiddenRetryButtons, setHiddenRetryButtons] = useState<string[]>([]);

  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  const toggleCard = (id: string) => {
    setExpandedCards(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Función para cambiar de pestaña actualizando el historial del navegador
  // Esto hace que el botón Atrás del iPhone funcione correctamente
  const switchTab = (tab: "activas" | "historial") => {
    setActiveTab(tab);
    const newUrl = tab === "historial" ? "/portal?tab=historial" : "/portal";
    window.history.pushState({ tab }, "", newUrl);
    window.scrollTo({ top: 0, behavior: 'auto' });
  };

  // Escuchar el botón Atrás/Adelante del navegador (gesto iPhone, botón Android, etc.)
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      if (e.state && typeof e.state.tab === "string") {
        setActiveTab(e.state.tab as "activas" | "historial");
      } else {
        // Sin estado guardado: leer la URL directamente
        const params = new URLSearchParams(window.location.search);
        setActiveTab(params.get("tab") === "historial" ? "historial" : "activas");
      }
    };

    // Registrar el estado inicial en el historial del navegador
    const initialTab = tabFromUrl();
    window.history.replaceState({ tab: initialTab }, "", window.location.href);

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── POLLING SILENCIOSO ──────────────────────────────────────────────────────
  // Cada 15 segundos pregunta al servidor si hay cambios en las citas.
  // El servidor valida la cookie, así la tabla sigue 100% bloqueada en Supabase.
  useEffect(() => {
    const fetchCitas = async () => {
      try {
        const res = await fetch("/api/citas/mis-citas", { cache: "no-store" });
        if (!res.ok) return; // Silencioso: no mostramos error al usuario
        const data = await res.json();
        if (Array.isArray(data.citas)) {
          setCitas(prev => {
            // Solo actualizar si algo cambió (evitar re-renders innecesarios)
            const prevStr = JSON.stringify(prev.map(c => `${c.id}-${c.estado}-${c.expiresAt}`));
            const nextStr = JSON.stringify(data.citas.map((c: any) => `${c.id}-${c.estado}-${c.expiresAt}`));
            return prevStr === nextStr ? prev : data.citas;
          });
        }
      } catch {
        // Error de red silencioso, lo intentará en el próximo ciclo
      }
    };

    const intervalo = setInterval(fetchCitas, 15000); // cada 15 segundos
    return () => clearInterval(intervalo);
  }, []);


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
  const handleCancelAppointment = (citaId: string) => {
    setShowCancelModal(citaId);
  };

  const confirmCancel = async () => {
    if (!showCancelModal) return;
    
    const citaId = showCancelModal;
    setShowCancelModal(null);
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

      // Optimistically update the UI: change state to CANCELADA_POR_CLIENTE
      const canceledCita = citas.find(c => c.id === citaId);
      
      setCitas(prevCitas => 
        prevCitas.map(cita => {
          if (cita.id === citaId || (canceledCita?.grupoId && cita.grupoId === canceledCita.grupoId)) {
            return { ...cita, estado: "CANCELADA_POR_CLIENTE", expiresAt: null };
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

  const handleIrAlPaso2 = () => {
    if (!showRetryFailedModal) return;
    const { citaBase, grupo } = showRetryFailedModal;

    // Reconstruir carrito para el paso 2
    const servicesToRetry = grupo.map(c => ({
        id: c.servicioId,
        nombre: c.servicioNombre,
        precio: c.precioTotal,
        duracionMin: c.duracionMin,
        bufferMin: 0,
        profesionalId: c.profesionalId,
        profesionalNombre: c.profesionalNombre,
        uid: Math.random().toString(36).substring(2, 11)
    }));

    try {
       sessionStorage.setItem('lola_booking_services', JSON.stringify(servicesToRetry));
       sessionStorage.setItem('lola_booking_step', '2');
       sessionStorage.setItem('lola_booking_rules_accepted', 'true');
       router.push('/reservar');
    } catch (e) {
       console.error("Error al inyectar carrito", e);
    }
  };

  const handleRetomarReserva = async (citaBase: CitaData, grupo: CitaData[]) => {
    setLoadingAction(citaBase.id);
    setActionError(null);
    setActionSuccess(null);
    
    try {
      const res = await fetch("/api/citas/reintentar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ citaId: citaBase.id, grupoId: citaBase.grupoId }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409 || res.status === 400 || res.status === 404 || res.status === 500) {
           setHiddenRetryButtons(prev => [...prev, citaBase.id]);
           setShowRetryFailedModal({ citaBase, grupo, error: data.message || data.error || "El horario ya no está disponible." });
           return;
        }
        throw new Error(data.message || data.error || "No se pudo retomar la reserva");
      }

      setActionSuccess("¡Cupo recuperado con éxito!");
      setTimeout(() => window.location.reload(), 1500);

    } catch (err: any) {
      setActionError(err.message || "Error al retomar la reserva");
      setTimeout(() => setActionError(null), 8000);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleEnviarReprogramacion = () => {
    if (!showReprogramarModal) return;
    
    const formattedDate = formatFriendlyDate(showReprogramarModal.fechaHoraInicio);
    const formattedTime = formatFriendlyTime(showReprogramarModal.fechaHoraInicio);
    
    let text = `Hola Mile Almanza, soy ${cliente.nombre}. Quisiera solicitar un cambio de fecha/hora para mi cita de *${showReprogramarModal.servicioNombre}* programada originalmente para el *${formattedDate}* a las *${formattedTime}*.`;
    
    text += `\n\n*Me gustaría reprogramarla para:*`;
    
    if (reprogramarFecha) {
      // Convertir 'YYYY-MM-DD' a formato amigable
      const [year, month, day] = reprogramarFecha.split('-');
      const dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      const friendlyDate = dateObj.toLocaleDateString("es-CO", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      text += `\n📅 Fecha: ${friendlyDate}`;
    }
    
    if (reprogramarHora) {
      // Convertir 'HH:mm' a 12-horas AM/PM
      const [hourStr, minStr] = reprogramarHora.split(':');
      let hour = parseInt(hourStr);
      const ampm = hour >= 12 ? 'p. m.' : 'a. m.';
      hour = hour % 12;
      hour = hour ? hour : 12; // 0 se convierte en 12
      const friendlyTime = `${hour.toString().padStart(2, '0')}:${minStr} ${ampm}`;
      text += `\n⏰ Hora: ${friendlyTime}`;
    }
    
    if (reprogramarMotivo) text += `\n📝 Motivo: ${reprogramarMotivo}`;
    
    text += `\n\n¿Qué disponibilidad tienen?`;

    const cleanNumber = whatsappNumero.replace(/\+/g, '');
    const link = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(text)}`;
    
    window.open(link, '_blank');
    
    setShowReprogramarModal(null);
    setReprogramarFecha("");
    setReprogramarHora("");
    setReprogramarMotivo("");
  };

  const handleEnviarComprobante = () => {
    if (!showConfirmarPagoModal) return;

    const formattedDate = formatFriendlyDate(showConfirmarPagoModal.fechaHoraInicio);
    const formattedTime = formatFriendlyTime(showConfirmarPagoModal.fechaHoraInicio);
    
    const metodo = showConfirmarPagoModal.metodoPago || 'el método seleccionado';
    const metodoPretty = metodo.charAt(0).toUpperCase() + metodo.slice(1).toLowerCase();

    const text = `Hola Mile Almanza, soy ${cliente.nombre}. Te envío las imágenes del comprobante de pago para mi cita de *${showConfirmarPagoModal.servicioNombre}* programada para el *${formattedDate}* a las *${formattedTime}*. (ID: ${showConfirmarPagoModal.id})\n\n💰 *Método de pago:* ${metodoPretty}`;

    const cleanNumber = whatsappNumero.replace(/\+/g, '');
    const link = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(text)}`;
    
    window.open(link, '_blank');
    
    setShowConfirmarPagoModal(null);
    setSelectedPaymentMethod("");
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

  // Helper: Format Duration (e.g. 90 -> 1h 30min)
  const formatDuration = (mins: number) => {
    if (mins < 60) return `${mins} min`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h ${m}min` : `${h}h`;
  };

  const capitalizeFirst = (str: string) => {
    if (!str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  };

  // Separar citas activas e historial
  // Historial = todas las citas propias del cliente (no de la amiga)
  // Activa = No cancelada ni completada ni no asistio, y en el futuro
  const now = new Date();
  
  // Helper: Asignar peso de urgencia a los estados
  const getEstadoPeso = (estado: string) => {
    switch (estado) {
      case "PRE_AGENDADA": return 1; // Mayor urgencia (requiere pago o acción)
      case "EN_REVISION": return 2;  // Media urgencia (esperando validación de pago)
      case "CONFIRMADA": 
      case "REAGENDADA": return 3;   // Menor urgencia (todo listo, solo asistir)
      default: return 4;
    }
  };

  const citasActivas = citas.filter(cita => {
    const inPast = new Date(cita.fechaHoraInicio) < now;
    const isInactiveState = ["CANCELADA", "CANCELADA_POR_CLIENTE", "CANCELADA_SISTEMA", "CANCELADA_FALTA_PAGO", "COMPLETADA", "NO_ASISTIO"].includes(cita.estado);
    return !isInactiveState && !inPast;
  }).sort((a, b) => {
    const pesoA = getEstadoPeso(a.estado);
    const pesoB = getEstadoPeso(b.estado);
    if (pesoA !== pesoB) {
      return pesoA - pesoB; // Menor peso = mayor prioridad
    }
    // Si tienen la misma urgencia, priorizamos cronológicamente (la más próxima)
    return new Date(a.fechaHoraInicio).getTime() - new Date(b.fechaHoraInicio).getTime();
  });

  // El historial muestra TODAS las reservas relacionadas con el cliente
  const citasHistorial = citas;

  // Elegir la cita activa principal (la de mayor urgencia, luego la más próxima)
  const citaActivaRaw = citasActivas.length > 0 ? citasActivas[0] : null;

  // Agrupar si es PRE_AGENDADA y tiene grupo
  let serviciosAgrupados: CitaData[] = [];
  let citaActivaPrincipal: CitaData | null = null;

  if (citaActivaRaw) {
    if (citaActivaRaw.grupoId) {
      serviciosAgrupados = citasActivas
        .filter(c => c.grupoId === citaActivaRaw.grupoId)
        .sort((a, b) => new Date(a.fechaHoraInicio).getTime() - new Date(b.fechaHoraInicio).getTime());
      
      const endTimeMax = new Date(Math.max(...serviciosAgrupados.map(c => new Date(c.fechaHoraFin).getTime())));
      
      const titularId = serviciosAgrupados.find(c => c.reservaTitularId)?.reservaTitularId || null;
      // Buscar el nombre del titular en CUALQUIER cita del grupo que lo tenga
      const titularNombreResuelto = serviciosAgrupados.find(c => c.titularNombre)?.titularNombre || null;
      const citaBase = { ...serviciosAgrupados[0], reservaTitularId: titularId, titularNombre: titularNombreResuelto };
      const isAmigas = serviciosAgrupados.some(c => c.reservaTitularId !== null && c.reservaTitularId !== undefined) || new Set(serviciosAgrupados.map(c => c.clienteNombre || 'Cliente')).size > 1;
      
      citaActivaPrincipal = {
        ...citaBase,
        servicioNombre: serviciosAgrupados.length > 1 ? (isAmigas ? "Reserva de Amigas" : "Paquete de Servicios") : citaBase.servicioNombre,
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
        const startTimeMinCita = grupo.reduce((earliest, current) => 
          new Date(current.fechaHoraInicio) < new Date(earliest.fechaHoraInicio) ? current : earliest
        , grupo[0]);
        
        const titularId = grupo.find(c => c.reservaTitularId)?.reservaTitularId || null;
        const titularNombre = grupo.find(c => c.titularNombre)?.titularNombre || null;
        // Clonamos la primera cita del grupo (cronológicamente) para usarla como base
        const citaBase = { ...startTimeMinCita, reservaTitularId: titularId, titularNombre };
        const isAmigas = grupo.some(c => c.reservaTitularId !== null && c.reservaTitularId !== undefined) || new Set(grupo.map(c => c.clienteNombre || 'Cliente')).size > 1;
        
        otrasCitasAgrupadas.push({
          ...citaBase,
          servicioNombre: grupo.length > 1 ? (isAmigas ? "Reserva de Amigas" : "Paquete de Servicios") : citaBase.servicioNombre,
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
          styles: "bg-gold/20 text-gold border-gold/50",
          glow: "0 0 14px rgba(212,175,55,0.7), 0 0 6px rgba(212,175,55,0.4)",
          icon: <CheckCircle className="w-3.5 h-3.5" />
        };
      case "EN_REVISION":
        return {
          text: "En Revisión",
          styles: "bg-amber-500/20 text-amber-300 border-amber-400/50",
          glow: "0 0 14px rgba(251,191,36,0.7), 0 0 6px rgba(251,191,36,0.4)",
          icon: <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
        };
      case "PRE_AGENDADA":
        return {
          text: "Cupo Temporal",
          styles: "bg-white/10 text-text-primary border-white/20",
          glow: "0 0 10px rgba(255,255,255,0.2)",
          icon: <Clock className="w-3.5 h-3.5" />
        };
      case "REAGENDADA":
        return {
          text: "Reagendada",
          styles: "bg-blue-500/20 text-blue-300 border-blue-400/50",
          glow: "0 0 14px rgba(59,130,246,0.7), 0 0 6px rgba(59,130,246,0.4)",
          icon: <Calendar className="w-3.5 h-3.5" />
        };
      case "COMPLETADA":
        return {
          text: "Completada",
          styles: "bg-green-500/20 text-green-300 border-green-400/50",
          glow: "0 0 14px rgba(34,197,94,0.7), 0 0 6px rgba(34,197,94,0.4)",
          icon: <CheckCircle className="w-3.5 h-3.5" />
        };
      case "CANCELADA":
      case "CANCELADA_POR_CLIENTE":
      case "CANCELADA_SISTEMA":
      case "CANCELADA_FALTA_PAGO":
        return {
          text: estado === "CANCELADA_POR_CLIENTE" ? "Cancelaste esta cita" : estado === "CANCELADA_FALTA_PAGO" ? "Cancelada por falta de pago" : "Cancelada",
          styles: "bg-white/5 text-text-muted border-white/10",
          glow: "none",
          icon: <XCircle className="w-3.5 h-3.5" />
        };
      case "NO_ASISTIO":
        return {
          text: "Inasistencia",
          styles: "bg-red-500/20 text-red-300 border-red-400/50",
          glow: "0 0 14px rgba(239,68,68,0.7), 0 0 6px rgba(239,68,68,0.4)",
          icon: <AlertCircle className="w-3.5 h-3.5" />
        };
      default:
        return {
          text: estado,
          styles: "bg-white/5 text-text-secondary border-white/10",
          glow: "none",
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
    
    // Si viene con '+', lo limpiamos por precaución
    const cleanNumber = whatsappNumero.replace(/\+/g, '');
    return `https://wa.me/${cleanNumber}?text=${encodeURIComponent(text)}`;
  };

  // Helper: Renderize Actions based on business rules
  const renderActions = (cita: CitaData, isPrimary: boolean) => {
    const isAmiga = cita.reservaTitularId && cita.reservaTitularId !== cliente.id;

    const btnClass = isPrimary 
      ? "flex-1 bg-white/5 border border-white/10 text-xs py-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 font-bold uppercase tracking-wider"
      : "bg-white/5 border border-white/5 hover:border-gold/30 hover:bg-gold/5 text-gold font-semibold text-[10px] px-3.5 py-1.5 rounded-lg transition-all text-center flex items-center gap-1.5";

    if (cita.estado === "PRE_AGENDADA") {
      if (isAmiga) {
        return (
          <div className="flex-1 bg-white/5 border border-white/5 px-4 py-3 rounded-xl text-center">
            <span className="text-text-muted text-xs block text-balance">
              El pago y gestión de este cupo temporal está a cargo de <strong className="text-white">{cita.titularNombre || 'quien realizó la reserva'}</strong>. Comunícate con él/ella para el abono respectivo.
            </span>
          </div>
        );
      }

      return (
        <>
          <button
            onClick={() => setShowConfirmarPagoModal(cita)}
            className={isPrimary 
              ? "flex-1 bg-gradient-to-r from-gold-dark to-gold text-black font-bold uppercase tracking-wider text-xs py-3 rounded-xl cursor-pointer hover:brightness-110 text-center transition-all duration-300 block"
              : "bg-gold hover:brightness-110 text-black font-semibold text-[10px] uppercase tracking-wider px-3.5 py-1.5 rounded-lg transition-all shadow-[0_2px_10px_rgba(212,175,55,0.2)] inline-block"
            }
          >
            Confirmar Pago
          </button>
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
      if (isAmiga) {
        return null;
      }

      const horasRestantes = (new Date(cita.fechaHoraInicio).getTime() - now.getTime()) / (1000 * 60 * 60);
      
      if (horasRestantes > 12) {
        return (
          <button
            onClick={() => setShowReprogramarModal(cita)}
            className={`${btnClass} hover:border-gold/30 text-gold hover:bg-gold/5`}
          >
            <MessageSquare className={isPrimary ? "w-4 h-4" : "w-3.5 h-3.5"} />
            Reprogramar Cita
          </button>
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
    <div className="min-h-screen flex flex-col font-inter text-text-primary flex-1 overflow-x-hidden relative">
      {/* Estética Premium: Círculos de luz flotantes */}
      <div className="absolute top-[-10%] left-[-20%] w-[60%] aspect-square rounded-full bg-gold opacity-[0.03] blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-20%] w-[60%] aspect-square rounded-full bg-red-urgency opacity-[0.02] blur-[120px] pointer-events-none" />

      {/* Header Fino */}
      <header className="w-full border-b border-white/5 bg-bg-card/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2 group cursor-pointer">
            <span className="font-display font-bold tracking-[0.12em] text-xs uppercase text-transparent bg-clip-text bg-gradient-to-r from-gold-light via-gold to-gold-dark transition-all duration-300">
              Mile Almanza
            </span>
          </Link>

          <nav className="flex items-center gap-6">
            <button 
              onClick={() => switchTab("activas")} 
              className={`text-xs tracking-wider uppercase font-semibold pb-1 pt-1 transition-colors ${activeTab === "activas" ? "text-gold border-b-2 border-gold/80" : "text-text-secondary hover:text-text-primary"}`}
            >
              Mis Citas
            </button>
            <button 
              onClick={() => switchTab("historial")} 
              className={`text-xs tracking-wider uppercase font-semibold pb-1 pt-1 transition-colors ${activeTab === "historial" ? "text-gold border-b-2 border-gold/80" : "text-text-secondary hover:text-text-primary"}`}
            >
              Historial de Citas
            </button>
            <Link 
              href="/portal/perfil"
              className="text-xs tracking-wider uppercase font-semibold text-text-secondary hover:text-text-primary transition-colors pb-1 pt-1"
            >
              Mi Perfil
            </Link>
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
                        )
                        .sort(([nombreA], [nombreB]) => {
                          if (nombreA === cliente.nombre) return -1;
                          if (nombreB === cliente.nombre) return 1;
                          return nombreA.localeCompare(nombreB);
                        })
                        .map(([nombre, servicios]) => (
                          <div key={nombre} className="flex flex-col border-l-2 border-gold/30 pl-2">
                            <span className="font-semibold text-gold/80 mb-0.5">
                              {nombre === cliente.nombre 
                                ? (servicios.length === 1 ? "Tu servicio" : "Tus servicios") 
                                : (servicios.length === 1 ? `Servicio de ${nombre}` : `Servicios de ${nombre}`)}
                            </span>
                            {servicios.map((s, idx) => (
                              <div key={idx} className="flex items-start gap-1.5">
                                <span className="text-gold-light drop-shadow-[0_0_2px_rgba(251,191,36,0.8)] mt-[1px] shrink-0 leading-none">•</span>
                                <span className="leading-snug break-words">{s}</span>
                              </div>
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
                  
                  <div className="flex items-center gap-3 bg-white/[0.02] p-3 rounded-xl border border-white/5 transition-colors hover:bg-white/[0.04]">
                    <div className="w-9 h-9 rounded-full bg-gold/10 flex items-center justify-center shrink-0">
                      <Calendar className="w-4 h-4 text-gold" />
                    </div>
                    <div>
                      <div className="text-xs uppercase font-semibold text-text-muted">Fecha</div>
                      <div className="font-semibold text-text-primary text-sm capitalize">
                        {formatFriendlyDate(citaActivaPrincipal.fechaHoraInicio)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 bg-white/[0.02] p-3 rounded-xl border border-white/5 transition-colors hover:bg-white/[0.04]">
                    <div className="w-9 h-9 rounded-full bg-gold/10 flex items-center justify-center shrink-0">
                      <Clock className="w-4 h-4 text-gold" />
                    </div>
                    <div>
                      <div className="text-xs uppercase font-semibold text-text-muted">Horario</div>
                      <div className="font-semibold text-text-primary text-sm">
                        {formatFriendlyTime(citaActivaPrincipal.fechaHoraInicio)} - {formatFriendlyTime(citaActivaPrincipal.fechaHoraFin)}
                        <span className="text-xs text-text-secondary font-medium ml-1.5">({formatDuration(citaActivaPrincipal.duracionMin)})</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 bg-white/[0.02] p-3 rounded-xl border border-white/5 transition-colors hover:bg-white/[0.04]">
                    <div className="w-9 h-9 rounded-full bg-gold/10 flex items-center justify-center shrink-0">
                      <User className="w-4 h-4 text-gold" />
                    </div>
                    <div>
                      <div className="text-xs uppercase font-semibold text-text-muted">Especialista</div>
                      <div className="font-semibold text-text-primary text-sm">
                        {citaActivaPrincipal.profesionalNombre}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 bg-white/[0.02] p-3 rounded-xl border border-white/5 transition-colors hover:bg-white/[0.04]">
                    <div className="w-9 h-9 rounded-full bg-gold/10 flex items-center justify-center shrink-0">
                      <DollarSign className="w-4 h-4 text-gold" />
                    </div>
                    <div className="flex-1">
                      {(() => {
                        const abonoReq = getAbonoRequerido(citaActivaPrincipal);
                        return abonoReq ? (
                          <div className="flex flex-col gap-1 w-full pr-2">
                            <div className="flex items-center justify-between w-full">
                              <span className="text-[11px] uppercase font-bold text-gold">Abono:</span>
                              <span className="font-bold text-gold text-sm bg-gold/10 px-2 py-0.5 rounded-md border border-gold/20 shadow-[0_0_10px_rgba(212,175,55,0.1)]">
                                {formatCurrency(abonoReq)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between w-full border-t border-white/5 pt-1.5 mt-0.5">
                              <span className="text-[10px] uppercase font-semibold text-text-muted">Total Cita:</span>
                              <span className="text-xs font-semibold text-text-secondary">
                                {formatCurrency(citaActivaPrincipal.precioTotal)}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-1">
                            <div className="text-xs uppercase font-semibold text-text-muted">Inversión Total</div>
                            <div className="font-bold text-text-primary text-sm bg-white/5 px-2.5 py-1 rounded-md border border-white/10 self-start shadow-inner">
                              {formatCurrency(citaActivaPrincipal.precioTotal)}
                            </div>
                          </div>
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
                  Resalta tu belleza agendando cualquiera de nuestros servicios y experiencias premium.
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
            <div className="space-y-6">
              {otrasCitasAgrupadas.map((cita, index) => (
                <div key={cita.id} className="glass rounded-xl p-4.5 border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-gold/20 transition-all overflow-hidden relative">
                  <div className="space-y-1 relative z-10">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm tracking-wide text-text-primary flex items-center gap-2">
                        <span className="text-[10px] text-gold/50 bg-gold/5 px-1.5 py-0.5 rounded font-mono border border-gold/10">#{otrasCitasAgrupadas.length - index}</span>
                        {cita.servicioNombre}
                      </span>
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
                          )
                          .sort(([nombreA], [nombreB]) => {
                            if (nombreA === cliente.nombre) return -1;
                            if (nombreB === cliente.nombre) return 1;
                            return nombreA.localeCompare(nombreB);
                          })
                          .map(([nombre, servicios]) => (
                            <div key={nombre} className="flex flex-col border-l-2 border-gold/30 pl-2">
                              <span className="font-semibold text-gold/80 mb-0.5">
                                {nombre === cliente.nombre 
                                  ? (servicios.length === 1 ? "Tu servicio" : "Tus servicios") 
                                  : (servicios.length === 1 ? `Servicio de ${nombre}` : `Servicios de ${nombre}`)}
                              </span>
                              {servicios.map((s, idx) => (
                                <div key={idx} className="flex items-start gap-1.5">
                                  <span className="text-gold-light drop-shadow-[0_0_2px_rgba(251,191,36,0.8)] mt-[1px] shrink-0 leading-none">•</span>
                                  <span className="leading-snug break-words">{s}</span>
                                </div>
                              ))}
                            </div>
                          ))}
                        </div>
                      )}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-secondary mt-1">
                      <span className="capitalize">{formatFriendlyDate(cita.fechaHoraInicio).split(",")[1]}</span>
                      <span>•</span>
                      <span>{formatFriendlyTime(cita.fechaHoraInicio)} - {formatFriendlyTime(cita.fechaHoraFin)} <span className="text-[10px] ml-0.5">({formatDuration(cita.duracionMin)})</span></span>
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
        {activeTab === "historial" && (() => {
          // Agrupar historial por grupoId
          const historialAgrupado: { key: string; citas: CitaData[]; grupoId: string | null; fechaBase: number; }[] = [];
          const vistosHistorial = new Set<string>();

          citasHistorial.forEach(cita => {
            if (vistosHistorial.has(cita.id)) return;
            if (cita.grupoId) {
              // Grupo: agrupar todas las citas de este grupo
              const grupo = citasHistorial.filter(c => c.grupoId === cita.grupoId);
              grupo.forEach(c => vistosHistorial.add(c.id));
              const fechaBase = Math.max(...grupo.map(c => new Date(c.createdAt || c.fechaHoraInicio).getTime()));
              historialAgrupado.push({ key: cita.grupoId, citas: grupo, grupoId: cita.grupoId, fechaBase });
            } else {
              vistosHistorial.add(cita.id);
              historialAgrupado.push({ key: cita.id, citas: [cita], grupoId: null, fechaBase: new Date(cita.createdAt || cita.fechaHoraInicio).getTime() });
            }
          });

          // Ordenar los grupos por su fecha base descendente
          historialAgrupado.sort((a, b) => b.fechaBase - a.fechaBase);

          const estadosFiltro = filtroEstado === "TODOS"
            ? historialAgrupado
            : filtroEstado === "CANCELADAS"
              ? historialAgrupado.filter(g => g.citas.some(c => ["CANCELADA", "CANCELADA_FALTA_PAGO", "CANCELADA_POR_CLIENTE"].includes(c.estado)))
              : historialAgrupado.filter(g => g.citas.some(c => c.estado === filtroEstado));

          return (
            <div className="space-y-4 animate-fade-in-up">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 border-b border-white/5 pb-4">
                <h2 className="text-xs uppercase tracking-widest text-text-muted font-bold flex items-center gap-2">
                  Historial de Visitas
                  <span className="bg-white/5 border border-white/5 text-text-muted px-2 py-0.5 rounded-full font-bold">
                    {historialAgrupado.length}
                  </span>
                </h2>
                <select
                  value={filtroEstado}
                  onChange={(e) => setFiltroEstado(e.target.value)}
                  className="bg-bg-card border border-white/10 rounded-lg text-xs px-3 py-2 text-text-primary outline-none focus:border-gold/50 cursor-pointer"
                >
                  <option value="TODOS">Todos los estados</option>
                  <option value="PRE_AGENDADA">Pre-agendada</option>
                  <option value="EN_REVISION">En Revisión</option>
                  <option value="CONFIRMADA">Confirmada</option>
                  <option value="COMPLETADA">Completada</option>
                  <option value="CANCELADAS">Canceladas</option>
                </select>
              </div>

              <div className="space-y-6">
                {estadosFiltro.length > 0 ? (
                  estadosFiltro.map(({ key, citas: grupo }, index) => {
                    // Tomar la cita "base" (la más temprana del grupo)
                    const citaBase = [...grupo].sort((a, b) =>
                      new Date(a.fechaHoraInicio).getTime() - new Date(b.fechaHoraInicio).getTime()
                    )[0];
                    const historyIndex = estadosFiltro.length - index;
                    const esGrupo = grupo.length > 1;
                    const isAmigas = grupo.some(c => c.reservaTitularId !== null && c.reservaTitularId !== undefined) || new Set(grupo.map(c => c.clienteNombre || 'Cliente')).size > 1;
                    const estadoBase = citaBase.estado;
                    const badge = getBadgeConfig(estadoBase);
                    const totalPrecio = grupo.reduce((acc, c) => acc + c.precioTotal, 0);
                    const fechaCreacion = citaBase.createdAt
                      ? new Date(citaBase.createdAt).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })
                      : null;

                    return (
                      <div key={key} className="glass rounded-xl border border-white/5 hover:border-gold/20 transition-all overflow-hidden relative">
                        {/* Header de la tarjeta */}
                        <div className="p-4 flex items-start justify-between gap-3 relative z-10">
                          <div className="space-y-1.5 flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h5 className="font-semibold text-xs text-text-primary tracking-wide flex items-center gap-2">
                                <span className="text-[10px] text-gold/50 bg-gold/5 px-1.5 py-0.5 rounded font-mono border border-gold/10">#{historyIndex}</span>
                                {esGrupo ? (isAmigas ? "Reserva de Amigas" : "Paquete de Servicios") : citaBase.servicioNombre}
                              </h5>
                              {esGrupo && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-gold/10 border border-gold/20 text-gold font-bold uppercase tracking-wider">
                                  {grupo.length} servicios
                                </span>
                              )}
                            </div>
                            <div className="flex flex-col gap-1.5 mt-2">
                              <div className="flex items-center gap-2 text-[11px] text-text-secondary">
                                <Calendar className="w-3.5 h-3.5 text-gold/70" />
                                <span className="capitalize font-medium">{formatFriendlyDate(citaBase.fechaHoraInicio)}</span>
                              </div>
                              <div className="flex items-center gap-2 text-[11px] text-text-secondary">
                                <Clock className="w-3.5 h-3.5 text-gold/70" />
                                <span>{formatFriendlyTime(citaBase.fechaHoraInicio)} - {formatFriendlyTime(citaBase.fechaHoraFin)} <span className="text-[10px] text-text-muted">({formatDuration(citaBase.duracionMin)})</span></span>
                              </div>
                              {fechaCreacion && (
                                <div className="flex items-center gap-2 text-[10px] text-text-muted">
                                  <FileText className="w-3.5 h-3.5 opacity-50" />
                                  <span>Creada el {fechaCreacion}</span>
                                </div>
                              )}
                              <div className="flex items-center gap-2 text-[11px] text-text-secondary mt-0.5">
                                <User className="w-3.5 h-3.5 text-gold/70" />
                                <span>{citaBase.profesionalNombre}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2 shrink-0">
                            <span 
                              className={`flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full border ${badge.styles}`}
                              style={{ boxShadow: badge.glow }}
                            >
                              {badge.icon}
                              {badge.text}
                            </span>
                            <span className="text-xs font-semibold text-text-secondary">
                              {formatCurrency(totalPrecio)}
                            </span>
                          </div>
                        </div>

                        {/* Countdown Component (Only for PRE_AGENDADA) en el historial */}
                        {citaBase.estado === "PRE_AGENDADA" && citaBase.expiresAt && (
                          <div className="border-t border-white/5 bg-black/20">
                            <CountdownBanner 
                              expiresAtStr={citaBase.expiresAt} 
                              onExpire={() => {
                                setCitas(prevCitas => 
                                  prevCitas.map(cita => 
                                    (cita.id === citaBase.id || cita.grupoId === citaBase.grupoId) 
                                      ? { ...cita, estado: "CANCELADA_SISTEMA", expiresAt: null } 
                                      : cita
                                  )
                                );
                              }}
                            />
                          </div>
                        )}

                        {/* Sub-servicios si es grupo */}
                        {esGrupo && (
                          <div className="border-t border-white/5">
                            <button
                              onClick={() => toggleCard(key)}
                              className="w-full py-2.5 px-4 flex items-center justify-center gap-1.5 text-[10px] text-gold/70 hover:text-gold hover:bg-white/[0.02] transition-colors font-medium"
                            >
                              {expandedCards.has(key) ? (
                                <>Ocultar detalle <ChevronUp className="w-3.5 h-3.5" /></>
                              ) : (
                                <>Ver detalle de servicios <ChevronDown className="w-3.5 h-3.5" /></>
                              )}
                            </button>
                            
                            {expandedCards.has(key) && (
                              <div className="px-4 pb-3 pt-1 space-y-3 bg-white/[0.02] animate-in slide-in-from-top-1 fade-in duration-200">
                                {Object.entries(
                                  grupo.reduce((acc, srv) => {
                                    const nombre = srv.clienteNombre || cliente.nombre;
                                    if (!acc[nombre]) acc[nombre] = [];
                                    acc[nombre].push(srv);
                                    return acc;
                                  }, {} as Record<string, typeof grupo>)
                                )
                                .sort(([nombreA], [nombreB]) => {
                                  if (nombreA === cliente.nombre) return -1;
                                  if (nombreB === cliente.nombre) return 1;
                                  return nombreA.localeCompare(nombreB);
                                })
                                .map(([nombre, servicios]) => (
                                  <div key={nombre} className="flex flex-col border-l-2 border-gold/30 pl-2">
                                    <span className="font-semibold text-gold/80 mb-1.5">
                                      {nombre === cliente.nombre 
                                        ? (servicios.length === 1 ? "Tu servicio" : "Tus servicios") 
                                        : (servicios.length === 1 ? `Servicio de ${nombre.split(' ')[0]}` : `Servicios de ${nombre.split(' ')[0]}`)}
                                    </span>
                                    <div className="space-y-1.5">
                                      {servicios.map(srv => {
                                        let nombreLimpio = srv.servicioNombre.replace(/\s*-\s*Staff$/i, '');
                                        return (
                                          <div key={srv.id} className="flex justify-between items-start text-[11px] py-1.5 gap-3">
                                            <div className="flex-1 min-w-0 flex items-start gap-1.5">
                                              <span className="text-gold-light drop-shadow-[0_0_2px_rgba(251,191,36,0.8)] mt-[1.5px] shrink-0 leading-none">
                                                •
                                              </span>
                                              <span className="text-text-muted leading-snug break-words">
                                                {nombreLimpio}
                                                {srv.profesionalNombre.toLowerCase().includes('staff') && (
                                                  <span className="inline-block ml-1.5 text-[8px] bg-white/10 text-white/70 px-1.5 py-[2px] rounded-sm whitespace-nowrap align-middle relative -top-[1px]">
                                                    STAFF
                                                  </span>
                                                )}
                                              </span>
                                            </div>
                                            <div className="flex items-center gap-2.5 shrink-0 whitespace-nowrap pt-[2px]">
                                              <span className="text-[10px] text-text-muted">{formatDuration(srv.duracionMin)}</span>
                                              <span className="text-text-secondary font-medium">{formatCurrency(srv.precioTotal)}</span>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Botón Retomar Reserva (Solo CANCELADA_FALTA_PAGO) */}
                        {citaBase.estado === "CANCELADA_FALTA_PAGO" && !showRetryFailedModal && !hiddenRetryButtons.includes(citaBase.id) && (
                          <div className="border-t border-white/5 bg-black/20 p-3 flex justify-end">
                            <button
                              onClick={(e) => { e.stopPropagation(); handleRetomarReserva(citaBase, grupo); }}
                              disabled={loadingAction === citaBase.id}
                              className="px-4 py-2.5 bg-gradient-to-r from-gold-dark to-gold text-black font-bold uppercase tracking-wider text-[10px] rounded-xl transition-all hover:brightness-110 shadow-[0_2px_10px_rgba(212,175,55,0.2)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                              {loadingAction === citaBase.id ? 'Verificando cupo...' : 'Retomar Reserva'}
                            </button>
                          </div>
                        )}
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
          );
        })()}
      </main>

      {/* Footer Fino */}
      <footer className="w-full max-w-5xl mx-auto py-8 text-center text-xs text-text-muted border-t border-white/5 z-10 flex flex-col justify-center items-center gap-4 px-4 mt-auto">
        <div>
          © {new Date().getFullYear()} Mile Almanza Estética. Todos los derechos reservados.
        </div>
      </footer>

      {/* CUSTOM CANCEL MODAL */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowCancelModal(null)}></div>
          <div className="relative glass-strong border border-gold/20 p-6 rounded-2xl w-full max-w-sm shadow-2xl animate-scale-in">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gold/5 rounded-bl-full blur-2xl pointer-events-none" />
            <h3 className="text-lg font-bold text-gold font-display mb-3 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-gold" />
              Cancelar Reserva
            </h3>
            <p className="text-sm text-text-secondary mb-6 leading-relaxed">
              ¿Estás segura de que deseas cancelar esta reserva temporal? <span className="font-semibold text-text-primary">Liberarás el cupo inmediatamente.</span>
            </p>
            <div className="flex gap-3 justify-end relative z-10">
              <button 
                onClick={() => setShowCancelModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-text-muted hover:text-gold transition-colors"
              >
                VOLVER
              </button>
              <button 
                onClick={confirmCancel}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-white/5 text-text-primary border border-white/10 hover:bg-red-urgency/80 hover:text-white hover:border-red-urgency transition-all"
              >
                SÍ, CANCELAR
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Reprogramar Cita */}
      {showReprogramarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowReprogramarModal(null)}></div>
          <div className="relative glass-strong border border-gold/20 p-6 rounded-2xl w-full max-w-sm shadow-2xl animate-scale-in">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gold/5 rounded-bl-full blur-2xl pointer-events-none" />
            <h3 className="text-lg font-bold text-gold font-display mb-4 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-gold" />
              Reprogramar Cita
            </h3>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1.5 uppercase tracking-wider">Fecha Deseada (Opcional)</label>
                <input
                  type="date"
                  value={reprogramarFecha}
                  onChange={(e) => setReprogramarFecha(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/50 transition-all text-sm"
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1.5 uppercase tracking-wider">Hora Deseada (Opcional)</label>
                <input
                  type="time"
                  value={reprogramarHora}
                  onChange={(e) => setReprogramarHora(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/50 transition-all text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-text-muted mb-1.5 uppercase tracking-wider">Motivo (Opcional)</label>
                <textarea
                  value={reprogramarMotivo}
                  onChange={(e) => setReprogramarMotivo(e.target.value)}
                  placeholder="Ej: Se me presentó un inconveniente de última hora..."
                  rows={3}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/50 transition-all resize-none text-sm placeholder:text-text-muted/50"
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end relative z-10 mt-6 pt-4 border-t border-white/5">
              <button 
                onClick={() => setShowReprogramarModal(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-text-muted hover:text-gold transition-colors"
              >
                CANCELAR
              </button>
              <button 
                onClick={handleEnviarReprogramacion}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-gold-dark to-gold text-black hover:brightness-110 transition-all"
              >
                ENVIAR SOLICITUD
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmar Pago */}
      {showConfirmarPagoModal && (() => {
        const metodo = showConfirmarPagoModal.metodoPago || '';
        const metodoPretty = metodo ? metodo.charAt(0).toUpperCase() + metodo.slice(1).toLowerCase() : '';
        const numero = metodo === 'nequi' ? nequiNumero : metodo === 'daviplata' ? daviplataNumero : '';

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowConfirmarPagoModal(null)}></div>
            <div className="relative glass-strong border border-gold/20 p-6 rounded-2xl w-full max-w-sm shadow-2xl animate-scale-in">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gold/5 rounded-bl-full blur-2xl pointer-events-none" />
              <h3 className="text-lg font-bold text-gold font-display mb-2 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-gold" />
                Confirmar Pago
              </h3>

              <p className="text-sm text-text-secondary mb-5 leading-relaxed">
                Realiza el pago al número indicado y luego envíanos las imágenes del comprobante por WhatsApp.
              </p>

              {metodoPretty && numero ? (
                <div className="bg-white/5 border border-gold/20 rounded-xl p-4 mb-5">
                  <p className="text-xs text-text-muted uppercase tracking-wider mb-1">Método elegido al reservar</p>
                  <p className="text-base font-bold text-white mb-3">{metodoPretty}</p>
                  <div className="bg-[#1A1A1A] p-3 rounded-xl border border-gold/30 flex justify-between items-center group relative overflow-hidden shadow-inner">
                    <div className="flex flex-col relative z-10">
                      <span className="font-semibold text-text-secondary text-xs">
                        {metodoPretty}
                        {titularCuenta && <span className="text-xs font-normal text-text-muted ml-1">({titularCuenta})</span>}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 relative z-10">
                      <span className="font-bold text-lg tracking-wider text-white">{numero}</span>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          if (navigator.clipboard) {
                            navigator.clipboard.writeText(numero.replace(/\s/g, '')).catch(() => {});
                          }
                          const btn = e.currentTarget;
                          const originalHtml = btn.innerHTML;
                          btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-green-400"><path d="M20 6 9 17l-5-5"/></svg>';
                          setTimeout(() => btn.innerHTML = originalHtml, 2000);
                        }}
                        className="p-1.5 rounded-md bg-white/5 border border-white/10 hover:border-gold/50 text-text-muted hover:text-gold transition-colors shadow-sm"
                        title="Copiar número"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-5 text-center">
                  <p className="text-xs text-text-muted">Contacta a Mile Almanza para confirmar el método de pago.</p>
                </div>
              )}

              <div className="flex gap-3 justify-end relative z-10 pt-4 border-t border-white/5">
                <button 
                  onClick={() => setShowConfirmarPagoModal(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-text-muted hover:text-gold transition-colors"
                >
                  CANCELAR
                </button>
                <button 
                  onClick={handleEnviarComprobante}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-gold-dark to-gold text-black hover:brightness-110 transition-all"
                >
                  ENVIAR COMPROBANTE
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Modal Horario Ocupado / Reintento Fallido */}
      {showRetryFailedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowRetryFailedModal(null)}></div>
          <div className="relative glass-strong border border-white/10 p-6 rounded-2xl w-full max-w-sm shadow-2xl animate-scale-in">
            <h3 className="text-lg font-bold text-red-400 font-display mb-2 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-400" />
              Horario ya ocupado
            </h3>
            
            <p className="text-sm text-text-secondary mb-5 leading-relaxed">
              {showRetryFailedModal.error}
            </p>

            <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-5 text-sm text-text-muted">
               <p className="mb-2">¿Deseas buscar otra fecha u hora para estos mismos servicios?</p>
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => setShowRetryFailedModal(null)}
                className="flex-1 px-4 py-2.5 rounded-xl text-xs font-bold text-text-muted hover:text-white hover:bg-white/5 transition-colors border border-transparent hover:border-white/10"
              >
                CERRAR
              </button>
              <button 
                onClick={handleIrAlPaso2}
                className="flex-1 px-4 py-2.5 rounded-xl text-xs font-bold bg-white text-black hover:bg-gold transition-all shadow-[0_0_15px_rgba(255,255,255,0.1)]"
              >
                VER HORARIOS
              </button>
            </div>
          </div>
        </div>
      )}
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
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

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

  if (timeLeft === null) return null;

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
