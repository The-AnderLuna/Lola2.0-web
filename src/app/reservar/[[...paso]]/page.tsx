"use client";

import { useState, useEffect, useCallback } from "react";
import {
    Crown, ShoppingCart, Calendar, Clock, ArrowRight, ArrowLeft, CheckCircle2, User, Phone, Mail, FileText, Info, Loader2, ChevronRight, ChevronLeft, Feather, Eye, Droplets, Gift, Activity, Circle, CheckCircle, X, Search, AlertCircle, Copy, CreditCard, Wallet, Ban, CalendarClock, UserX, MapPin, Camera, Users, UserPlus, Plus, Minus, Trash2,
    Sparkles, Syringe, Scissors, Sun, PersonStanding, ClipboardList, Tag, Ticket, SmartphoneNfc, Landmark, Smile, SprayCan, Gem
} from "lucide-react";
import Link from "next/link";
import { RepositorioServicios } from "@/adaptadores/repositorios/RepositorioServicios";
import { RepositorioConfiguracion } from "@/adaptadores/repositorios/RepositorioConfiguracion";
import { Servicio } from "@/nucleo/entidades/Servicio";

type CartService = Servicio & { uid: string };


const mapeoPasoARuta: Record<number, string> = {
    0: "politicas",
    1: "catalogo",
    2: "fecha",
    3: "datos",
    4: "confirmar"
};

const mapeoRutaAPaso: Record<string, number> = {
    "politicas": 0,
    "catalogo": 1,
    "fecha": 2,
    "datos": 3,
    "confirmar": 4
};

// Función para leer la URL y determinar en qué paso y categoría estamos
const analizarRutaYParametros = (ruta: string, busqueda: string) => {
    const segmentos = ruta.split("/").filter(Boolean); // ej: ["reservar", "catalogo", "cejas"]
    const segmentoPaso = segmentos[1] || null; // "catalogo"
    const segmentoCategoria = segmentos[2] || null; // "cejas"

    const parametrosUrl = new URLSearchParams(busqueda);
    const parametroPasoAntiguo = parametrosUrl.get("paso") || parametrosUrl.get("step");
    const parametroCategoriaAntiguo = parametrosUrl.get("categoria");

    let pasoInicial = 0; // Por defecto: paso 0 (políticas)

    // 1. Priorizamos la nueva ruta amigable (ej: /reservar/catalogo)
    if (segmentoPaso && mapeoRutaAPaso[segmentoPaso] !== undefined) {
        pasoInicial = mapeoRutaAPaso[segmentoPaso];
    }
    // 2. Si no hay ruta amigable, intentamos con parámetros antiguos por compatibilidad (?paso=catalogo)
    else if (parametroPasoAntiguo) {
        if (mapeoRutaAPaso[parametroPasoAntiguo] !== undefined) {
            pasoInicial = mapeoRutaAPaso[parametroPasoAntiguo];
        } else if (!isNaN(parseInt(parametroPasoAntiguo, 10))) {
            pasoInicial = parseInt(parametroPasoAntiguo, 10);
        }
    }

    // La categoría puede venir de la ruta (ej: /catalogo/cejas) o del parámetro antiguo (?categoria=cejas)
    const categoriaInicial = segmentoCategoria || parametroCategoriaAntiguo || null;

    return { pasoInicial, categoriaInicial };
};

const formatearHora = (hora24: string | null): string => {
    if (!hora24) return "";
    const [horasStr, minutosStr] = hora24.split(":");
    const horas = parseInt(horasStr, 10);
    if (isNaN(horas)) return hora24;
    const ampm = horas >= 12 ? "PM" : "AM";
    const horas12 = horas % 12 === 0 ? 12 : horas % 12;
    return `${horas12}:${minutosStr} ${ampm}`;
};

const formatearDuracion = (minutos: number): string => {
    if (minutos < 60) return `${minutos} min`;
    const horas = Math.floor(minutos / 60);
    const minsRestantes = minutos % 60;
    if (minsRestantes === 0) {
        return `${horas} ${horas === 1 ? 'hora' : 'horas'}`;
    }
    return `${horas} ${horas === 1 ? 'hora' : 'horas'} y ${minsRestantes} min`;
};

// Fallback para crypto.randomUUID() — compatible con Android y navegadores viejos
const generateUID = (): string => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
};

export default function FlujoReserva() {
    const [step, setStep] = useState(0);

    // Data States
    const [categorias, setCategorias] = useState<{ id: string, nombre: string, grupos: { nombreBase: string, servicios: Servicio[] }[] }[]>([]);
    const [cargandoServicios, setCargandoServicios] = useState(true);
    const [configData, setConfigData] = useState<{ nequi_numero?: string, daviplata_numero?: string, titular_cuenta?: string, acepta_sistecredito?: boolean, acepta_tarjeta?: boolean, whatsapp_numero?: string } | null>(null);

    // Selection States
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [activeCategory, setActiveCategory] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedServices, setSelectedServices] = useState<CartService[]>([]);
    const [configuringGroup, setConfiguringGroup] = useState<{ nombreBase: string, servicios: Servicio[] } | null>(null);

    const [currentDate, setCurrentDate] = useState(new Date(2026, 4, 1)); // Mayo 2026
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [selectedTime, setSelectedTime] = useState<string | null>(null);
    const [metodoPago, setMetodoPago] = useState<'nequi' | 'daviplata' | 'sistecredito' | 'tarjeta'>('nequi');
    const [vipFeeAccepted, setVipFeeAccepted] = useState(false);
    const [pendingVipDay, setPendingVipDay] = useState<number | null>(null);
    const [clientData, setClientData] = useState({ nombre: "", telefono: "", email: "", cedula: "", cumpleanos: "" });
    const [codigoPais, setCodigoPais] = useState('+57');
    // --- RESERVA COMPARTIDA ---
    const [esReservaCompartida, setEsReservaCompartida] = useState(false);
    const [serviciosAmiga, setServiciosAmiga] = useState<CartService[]>([]);
    const [datosAmiga, setDatosAmiga] = useState({ nombre: "", telefono: "" });
    const [codigoPaisAmiga, setCodigoPaisAmiga] = useState('+57');

    // Estados de confirmación
    const [isConfirmed, setIsConfirmed] = useState(false);
    const [confirmedWppUrl, setConfirmedWppUrl] = useState('');

    // Estados de cupones
    const [codigoCupon, setCodigoCupon] = useState('');
    const [cuponActivo, setCuponActivo] = useState<any>(null);
    const [cuponError, setCuponError] = useState<string | null>(null);
    const [validandoCupon, setValidandoCupon] = useState(false);

    useEffect(() => {
        try {
            const saved = localStorage.getItem('lola_client_data');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed) setClientData(prev => ({ ...prev, ...parsed }));
            }
        } catch (e) { }
    }, []);

    const phoneDigits = clientData.telefono.replace(/\D/g, '');
    const phoneDigitsAmiga = datosAmiga.telefono.replace(/\D/g, '');

    // Autollenado desde la base de datos cuando el número de teléfono esté completo
    useEffect(() => {
        if (codigoPais === '+57' && phoneDigits.length === 10) {
            const fullPhone = `+57${phoneDigits}`;
            fetch(`/api/clientes/buscar?telefono=${encodeURIComponent(fullPhone)}`)
                .then(res => res.json())
                .then(data => {
                    if (data.encontrado && data.cliente) {
                        setClientData(prev => ({
                            ...prev,
                            nombre: prev.nombre || data.cliente.nombre,
                            email: prev.email || data.cliente.email,
                            cedula: prev.cedula || data.cliente.cedula,
                            cumpleanos: prev.cumpleanos || data.cliente.cumpleanos
                        }));
                    }
                })
                .catch(() => { });
        }
    }, [phoneDigits, codigoPais]);

    // Autollenado para la amiga
    useEffect(() => {
        if (codigoPaisAmiga === '+57' && phoneDigitsAmiga.length === 10) {
            const fullPhone = `+57${phoneDigitsAmiga}`;
            fetch(`/api/clientes/buscar?telefono=${encodeURIComponent(fullPhone)}`)
                .then(res => res.json())
                .then(data => {
                    if (data.encontrado && data.cliente) {
                        setDatosAmiga(prev => ({
                            ...prev,
                            nombre: prev.nombre || data.cliente.nombre
                        }));
                    }
                })
                .catch(() => { });
        }
    }, [phoneDigitsAmiga, codigoPaisAmiga]);

    // Estados del calendario real
    const [availableSlots, setAvailableSlots] = useState<string[]>([]);
    const [loadingSlots, setLoadingSlots] = useState(false);
    const [slotsError, setSlotsError] = useState<string | null>(null);
    const [daysWithSlots, setDaysWithSlots] = useState<Set<string>>(new Set());
    const [loadingDays, setLoadingDays] = useState(false);
    const [diasBloqueadosCargados, setDiasBloqueadosCargados] = useState<{fecha: string, profesional_id: string}[]>([]);
    const [bloqueoId, setBloqueoId] = useState<string | null>(null);
    const [lockedCitas, setLockedCitas] = useState<any[]>([]);
    const [lockingTime, setLockingTime] = useState<string | null>(null);
    const [lockTimeoutId, setLockTimeoutId] = useState<NodeJS.Timeout | null>(null);
    const [lockExpiresAt, setLockExpiresAt] = useState<number | null>(null);
    const [timeLeftStr, setTimeLeftStr] = useState<string | null>(null);
    const [openSections, setOpenSections] = useState<Set<string>>(new Set(['Mañana', 'Tarde', 'Noche']));
    const [showExpiredModal, setShowExpiredModal] = useState(false);
    const [showConflictModal, setShowConflictModal] = useState(false);
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [errorModalMsg, setErrorModalMsg] = useState('');
    const [showRulesError, setShowRulesError] = useState(false);
    const [showGrupoModal, setShowGrupoModal] = useState(false);
    const [grupoModalServicio, setGrupoModalServicio] = useState<string>('');

    const nextStep = () => setStep(s => Math.min(s + 1, 4));
    const prevStep = () => setStep(s => Math.max(s - 1, 0));

    const validarCupon = async () => {
        if (!codigoCupon.trim() || totalPrecioSinDescuento === 0) return;
        setValidandoCupon(true);
        setCuponError(null);
        try {
            const url = new URL('/api/cupones/validar', window.location.origin);
            url.searchParams.append('codigo', codigoCupon.toUpperCase());
            url.searchParams.append('total', totalPrecioSinDescuento.toString());
            const telLimpio = `${codigoPais}${clientData.telefono.replace(/\s/g, '')}`;
            url.searchParams.append('telefono', telLimpio);

            const res = await fetch(url.toString());
            const data = await res.json();
            if (res.ok && data.valido) {
                setCuponActivo(data);
            } else {
                setCuponError(data.error || 'Cupón inválido');
            }
        } catch (err) {
            setCuponError('Error validando cupón');
        } finally {
            setValidandoCupon(false);
        }
    };

    const removerCupon = () => {
        setCuponActivo(null);
        setCodigoCupon('');
        setCuponError(null);
    };

    // 1. Inicialización y manejo de navegación hacia atrás/adelante (PopState)
    useEffect(() => {
        const manejarRetrocesoNavegador = (evento: PopStateEvent) => {
            // Intentamos recuperar del estado guardado por el navegador
            if (evento.state && typeof evento.state.step === "number") {
                setStep(evento.state.step);
            } else {
                const { pasoInicial } = analizarRutaYParametros(window.location.pathname, window.location.search);
                setStep(pasoInicial);
            }

            if (evento.state && (evento.state.categoria === null || typeof evento.state.categoria === "string")) {
                setActiveCategory(evento.state.categoria);
            } else {
                const { categoriaInicial } = analizarRutaYParametros(window.location.pathname, window.location.search);
                setActiveCategory(categoriaInicial);
            }
        };

        // Al cargar la página por primera vez: leemos la URL para saber dónde arrancar
        const { pasoInicial, categoriaInicial } = analizarRutaYParametros(window.location.pathname, window.location.search);
        setStep(pasoInicial);
        setActiveCategory(categoriaInicial);

        // Sobrescribimos el estado inicial del navegador sin agregar un nuevo registro a la pila.
        // Esto evita el bucle infinito al presionar "Atrás".
        window.history.replaceState(
            { step: pasoInicial, categoria: categoriaInicial },
            "",
            window.location.pathname + window.location.search
        );

        window.addEventListener("popstate", manejarRetrocesoNavegador);
        return () => window.removeEventListener("popstate", manejarRetrocesoNavegador);
    }, []);

    // 2. Sincronización Programática: Actualizar la URL cuando avanzamos/retrocedemos usando los botones de la app
    useEffect(() => {
        const rutaPasoDestino = mapeoPasoARuta[step];
        let rutaDestinoUrl = "/reservar"; // Base limpia para el paso 0

        // Si estamos en paso 1 o superior, agregamos la subruta correspondiente
        if (step > 0 && rutaPasoDestino) {
            rutaDestinoUrl = `/reservar/${rutaPasoDestino}`;
            if (step === 1 && activeCategory) {
                rutaDestinoUrl = `/reservar/${rutaPasoDestino}/${activeCategory}`;
            }
        }

        const rutaActual = window.location.pathname;

        // Solo empujamos un nuevo estado si la ruta actual difiere de la ruta destino.
        // Si presionamos "Atrás", el navegador cambia la URL *antes* de disparar PopState,
        // por lo tanto rutaActual será igual a rutaDestinoUrl, evitando el error del bucle.
        if (rutaActual !== rutaDestinoUrl) {
            // Conservamos cualquier parámetro de búsqueda adicional (ej: ?preselect=...)
            const parametrosActuales = window.location.search;
            const nuevaUrlFinal = parametrosActuales ? `${rutaDestinoUrl}${parametrosActuales}` : rutaDestinoUrl;

            window.history.pushState(
                { step, categoria: activeCategory },
                "",
                nuevaUrlFinal
            );
        }
    }, [step, activeCategory]);

    // Actualizador visual del tiempo de reserva (Timer)
    useEffect(() => {
        if (!lockExpiresAt || isConfirmed) {
            setTimeLeftStr(null);
            return;
        }
        const updateTimer = () => {
            const remaining = Math.max(0, lockExpiresAt - Date.now());
            if (remaining <= 0) {
                setTimeLeftStr(null);
                setShowExpiredModal(true);
                setBloqueoId(null);
                return;
            }
            const mins = Math.floor(remaining / 60000);
            const secs = Math.floor((remaining % 60000) / 1000);
            setTimeLeftStr(`${mins}:${secs < 10 ? '0' : ''}${secs}`);
        };
        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    }, [lockExpiresAt, isConfirmed]);

    // Fetch Services on Mount
    useEffect(() => {
        async function cargarServicios() {
            try {
                setSlotsError(null);
                // 1. Intentar cargar del caché inmediatamente
                try {
                    const cached = localStorage.getItem('lola_categorias_cache');
                    if (cached) {
                        const parsed = JSON.parse(cached);
                        if (Array.isArray(parsed) && parsed.length > 0) {
                            setCategorias(parsed);
                            setCargandoServicios(false);
                        }
                    }
                } catch (e) {
                    console.warn("Error leyendo caché:", e);
                    localStorage.removeItem('lola_categorias_cache');
                }

                // 2. Traer de la DB
                const repo = new RepositorioServicios();
                const serviciosDb = await repo.obtenerActivos();

                // 3. Traer Configuración
                const configRepo = new RepositorioConfiguracion();
                const configDb = await configRepo.obtenerConfiguracion();
                if (configDb) {
                    setConfigData(configDb);
                }

                // Agrupar por categoría y luego por nombre base
                const categoriasMap = new Map<string, { nombreBase: string, servicios: Servicio[] }[]>();

                serviciosDb.forEach(s => {
                    const catKey = s.categoria || "Otros";
                    if (!categoriasMap.has(catKey)) {
                        categoriasMap.set(catKey, []);
                    }
                    const grupos = categoriasMap.get(catKey)!;
                    // Normalizar el nombre para agrupar (ej: "Micropigmentación de Cejas - Retoque" -> "Micropigmentación de Cejas")
                    const nombreBase = s.nombre.split(" - ")[0].trim();
                    let grupo = grupos.find(g => g.nombreBase === nombreBase);
                    if (!grupo) {
                        grupo = { nombreBase, servicios: [] };
                        grupos.push(grupo);
                    }
                    grupo.servicios.push(s);
                });

                // Ordenar servicios por precio dentro de cada grupo
                categoriasMap.forEach(grupos => {
                    grupos.forEach(g => {
                        g.servicios.sort((a, b) => a.precio - b.precio);
                    });
                    // Ordenar los grupos por su precio mínimo (el del primer servicio) de menor a mayor
                    grupos.sort((a, b) => {
                        const minA = a.servicios[0]?.precio || 0;
                        const minB = b.servicios[0]?.precio || 0;
                        return minA - minB;
                    });
                });

                const categoriasAgrupadas = Array.from(categoriasMap.entries()).map(([nombre, grupos]) => ({
                    id: nombre.toLowerCase().replace(/\s+/g, '-'),
                    nombre,
                    grupos
                }));

                const order = [
                    'cejas',
                    'pestañas',
                    'labios',
                    'faciales',
                    'facial',
                    'medicina estética',
                    'depilación',
                    'corporal',
                    'despigmentación',
                    'láser',
                    'valoraciones'
                ];

                categoriasAgrupadas.sort((a, b) => {
                    const indexA = order.indexOf(a.nombre.toLowerCase());
                    const indexB = order.indexOf(b.nombre.toLowerCase());

                    if (indexA === -1 && indexB === -1) return a.nombre.localeCompare(b.nombre);
                    if (indexA === -1) return 1;
                    if (indexB === -1) return -1;
                    return indexA - indexB;
                });

                setCategorias(categoriasAgrupadas);
                localStorage.setItem('lola_categorias_cache', JSON.stringify(categoriasAgrupadas));
            } catch (error: any) {
                console.error("Error al cargar servicios:", error);
                setSlotsError("Error de conexión con el catálogo. Por favor, recarga la página.");
            } finally {
                setCargandoServicios(false);
            }
        }
        cargarServicios();
    }, []);

    // Preselección por URL query params (preselect o servicio o categoria)
    useEffect(() => {
        if (categorias.length > 0 && typeof window !== "undefined") {
            const params = new URLSearchParams(window.location.search);
            const preselectId = params.get("preselect");
            const servicioParam = params.get("servicio");
            const categoriaParam = params.get("categoria");

            if (categoriaParam) {
                const foundCat = categorias.find(c => c.id === categoriaParam.toLowerCase() || c.nombre.toLowerCase().includes(categoriaParam.toLowerCase()));
                if (foundCat) {
                    setActiveCategory(foundCat.id);
                }
            }

            if (preselectId || servicioParam) {
                let foundService: Servicio | null = null;
                let foundCatId: string | null = null;

                // Buscar el servicio por ID o nombre
                for (const cat of categorias) {
                    for (const grp of cat.grupos) {
                        for (const s of grp.servicios) {
                            if (preselectId && s.id === preselectId) {
                                foundService = s;
                                foundCatId = cat.id;
                                break;
                            }
                            if (servicioParam && (
                                s.nombre.toLowerCase().includes(servicioParam.toLowerCase()) ||
                                grp.nombreBase.toLowerCase().includes(servicioParam.toLowerCase())
                            )) {
                                foundService = s;
                                foundCatId = cat.id;
                                break;
                            }
                        }
                        if (foundService) break;
                    }
                    if (foundService) break;
                }

                if (foundService) {
                    setSelectedServices([{ ...foundService, uid: generateUID() }]);
                    if (foundCatId) {
                        setActiveCategory(foundCatId);
                    }
                }
            }
        }
    }, [categorias]);

    // Utilidades
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(amount);
    };

    const toggleService = (srv: Servicio) => {
        setSelectedServices(prev => {
            const isSelected = prev.some(s => s.id === srv.id);
            if (isSelected) {
                return prev.filter(s => s.id !== srv.id);
            } else {
                return [...prev, { ...srv, uid: generateUID() }];
            }
        });

        setSelectedDate(null);
        setSelectedTime(null);
        setAvailableSlots([]);
    };

    const addServiceToCart = (srv: Servicio) => {
        // Si ya hay 2 del mismo servicio, bloquear y redirigir a WhatsApp
        const countActual = selectedServices.filter(s => s.id === srv.id).length;
        if (countActual >= 2) {
            setGrupoModalServicio(srv.nombre.replace(/ - (Mile|Staff)$/i, '').trim());
            setShowGrupoModal(true);
            return;
        }
        setSelectedServices(prev => [...prev, { ...srv, uid: generateUID() }]);
        setSelectedDate(null);
        setSelectedTime(null);
        setAvailableSlots([]);
    };

    const removeServiceFromCartByUid = (uid: string) => {
        setSelectedServices(prev => prev.filter(s => s.uid !== uid));
        setServiciosAmiga(prev => prev.filter(a => a.uid !== uid));
        setSelectedDate(null);
        setSelectedTime(null);
        setAvailableSlots([]);
    };

    const removeServiceGroupFromCart = (serviceId: string) => {
        setSelectedServices(prev => prev.filter(s => s.id !== serviceId));
        setServiciosAmiga(prev => prev.filter(a => a.id !== serviceId));
        setSelectedDate(null);
        setSelectedTime(null);
        setAvailableSlots([]);
    };

    const getCategoryIcon = (categoryName: string) => {
        const name = categoryName.toLowerCase();
        if (name.includes('cejas') || name.includes('pestañas')) return <Sparkles className="w-6 h-6 text-gold" />;
        if (name.includes('labios')) return <Smile className="w-6 h-6 text-gold" />;
        if (name.includes('facial') || name.includes('limpieza')) return <SprayCan className="w-6 h-6 text-gold" />;
        if (name.includes('medicina') || name.includes('estética')) return <Syringe className="w-6 h-6 text-gold" />;
        if (name.includes('depilación')) return <Scissors className="w-6 h-6 text-gold" />;
        if (name.includes('despigmentación')) return <Sun className="w-6 h-6 text-gold" />;
        if (name.includes('corporal')) return <PersonStanding className="w-6 h-6 text-gold" />;
        if (name.includes('valoración') || name.includes('valoracion')) return <ClipboardList className="w-6 h-6 text-gold" />;
        if (name.includes('promo')) return <Tag className="w-6 h-6 text-gold" />;
        return <Gem className="w-6 h-6 text-gold" />;
    };

    const isServiceSelected = (id: string) => selectedServices.some(s => s.id === id);

    const mileToStaffSwaps = selectedServices.map(srv => {
        const isMile = srv.responsable === 'Mile' || srv.nombre.toLowerCase().includes('- mile');
        if (!isMile) return { current: srv, staffVersion: null };

        const baseName = srv.nombre.replace(/ - (Mile|Staff)$/i, '').trim();
        let staffVersion = null;
        for (const cat of categorias) {
            const group = cat.grupos.find(g => g.nombreBase === baseName);
            if (group) {
                staffVersion = group.servicios.find(v => v.responsable === 'Staff' || v.nombre.toLowerCase().includes('- staff'));
                if (staffVersion) break;
            }
        }
        return { current: srv, staffVersion };
    });

    const hasMileServicesWithStaffAlternative = mileToStaffSwaps.some(swap => !!swap.staffVersion);

    const isVipDaySelected = selectedDate && [2, 4, 6].includes(selectedDate.getDay());
    const hasMileServices = selectedServices.some(s => s.responsable === 'Mile' || s.nombre.toLowerCase().includes('mile'));

    const getPotentialVipFee = () => {
        return selectedServices.reduce((total, srv) => {
            const isMile = srv.responsable === 'Mile' || srv.nombre.toLowerCase().includes('- mile');
            if (!isMile) return total;

            if (srv.precio >= 100000) return total + 15000;
            if (srv.precio >= 50000) return total + 10000;
            if (srv.precio >= 5000) return total + 5000;
            return total;
        }, 0);
    };
    const potentialVipFee = getPotentialVipFee();
    const vipFee = (vipFeeAccepted && hasMileServicesWithStaffAlternative && isVipDaySelected) ? potentialVipFee : 0;

    const totalPrecioSinDescuento = selectedServices.reduce((sum, s) => sum + s.precio, 0) + vipFee;
    const totalAbonoSinDescuento = selectedServices.reduce((sum, s) => sum + (s.precio * 0.5), 0) + vipFee;

    const totalPrecio = cuponActivo ? cuponActivo.nuevoTotal : totalPrecioSinDescuento;
    const totalAbono = cuponActivo ? cuponActivo.nuevoAbono : totalAbonoSinDescuento;

    const totalDuracion = selectedServices.reduce((sum, s) => sum + s.duracionMin + s.bufferMin, 0);
    // Servicios de la titular (excluye los de la amiga)
    const serviciosTitular = esReservaCompartida
        ? selectedServices.filter(s => !serviciosAmiga.some(a => a.uid === s.uid))
        : selectedServices;
    const totalPrecioAmiga = serviciosAmiga.reduce((sum, s) => sum + s.precio, 0);
    const totalAbonoAmiga = serviciosAmiga.reduce((sum, s) => sum + (s.precio * 0.5), 0);
    const totalPrecioTitular = esReservaCompartida ? totalPrecio - totalPrecioAmiga : totalPrecio;
    const totalAbonoTitular = esReservaCompartida ? totalAbono - totalAbonoAmiga : totalAbono;

    const buildPersonasPayload = () => {
        if (!esReservaCompartida || serviciosAmiga.length === 0) return null;
        const mapSrv = (s: CartService) => {
            const sIsStaff = s.nombre.toLowerCase().includes('staff') || s.responsable?.toLowerCase() === 'staff';
            const sIsMile = s.nombre.toLowerCase().includes('mile') || s.responsable?.toLowerCase() === 'mile';
            let pId = 'c2c0f778-c2fe-4f65-ab37-3b589cb997c2';
            if (sIsStaff && !sIsMile) pId = 'cc7bdd66-d98e-4c66-ae1d-b975e005bf56';
            return { uid: s.uid, profesionalId: pId, duracionMin: s.duracionMin + s.bufferMin, servicioId: s.id, precioTotal: s.precio };
        };
        return [
            serviciosTitular.map(mapSrv),
            serviciosAmiga.map(mapSrv)
        ];
    };

    const obtenerHoraServicio = (srv: CartService) => {
        const cita = lockedCitas.find(lc => lc.uid === srv.uid);
        if (!cita) return "";
        try {
            const d = new Date(cita.inicio);
            return d.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
                timeZone: 'America/Bogota'
            });
        } catch (e) {
            return "";
        }
    };

    // --- LÓGICA DEL CALENDARIO ---
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const firstDayOffset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

    const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

    const handleSelectDate = async (day: number, skipVipCheck = false) => {
        const dateToSelect = new Date(year, month, day);
        const dayOfWeek = dateToSelect.getDay();
        const isStaffDay = [2, 4, 6].includes(dayOfWeek); // Martes(2), Jueves(4), Sábado(6)

        // Si eligió Mile (para un servicio que Staff también hace) y escoge un día de Staff, lanzamos Modal
        if (hasMileServicesWithStaffAlternative && isStaffDay && !vipFeeAccepted && !skipVipCheck) {
            setPendingVipDay(day);
            return;
        }

        // Si escoge otro día diferente, reseteamos el VIP fee para que no se sume por accidente
        if (!isStaffDay && vipFeeAccepted) {
            setVipFeeAccepted(false);
        }

        setSelectedDate(dateToSelect);
        setSelectedTime(null);
        setAvailableSlots([]);
        setSlotsError(null);

        // Obtener slots reales de la API (con reintento automático para evitar fallos de red esporádicos)
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        setLoadingSlots(true);

        const querySlots = async (retryCount = 0): Promise<void> => {
            try {
                const personasPayload = buildPersonasPayload();
                let params: URLSearchParams;
                if (personasPayload) {
                    params = new URLSearchParams({
                        fecha: dateStr,
                        personas: JSON.stringify(personasPayload)
                    });
                } else {
                    const serviciosSecuencia = selectedServices.map(s => {
                        const sIsStaff = s.nombre.toLowerCase().includes('staff') || s.responsable?.toLowerCase() === 'staff';
                        const sIsMile = s.nombre.toLowerCase().includes('mile') || s.responsable?.toLowerCase() === 'mile';
                        let pId = 'c2c0f778-c2fe-4f65-ab37-3b589cb997c2';
                        if (sIsStaff && !sIsMile) pId = 'cc7bdd66-d98e-4c66-ae1d-b975e005bf56';
                        return { profesionalId: pId, duracionMin: s.duracionMin + s.bufferMin };
                    });
                    params = new URLSearchParams({
                        fecha: dateStr,
                        servicios: JSON.stringify(serviciosSecuencia)
                    });
                }

                const res = await fetch(`/api/disponibilidad?${params}`);
                const data = await res.json();
                if (data.error) throw new Error(data.error);
                setAvailableSlots(data.slots || []);
            } catch (err) {
                if (retryCount < 1) {
                    console.warn('Fallo temporal detectado. Reintentando cargar slots en 1 segundo...');
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    return querySlots(retryCount + 1);
                }
                console.error('Error cargando slots:', err);
                setSlotsError('No pudimos cargar los horarios. Intenta de nuevo.');
            }
        };

        await querySlots();
        setLoadingSlots(false);
    };

    // Polling silencioso en tiempo real (cada 15s) optimizado para evitar saturación del servidor y límites de API
    useEffect(() => {
        if (step !== 2 || !selectedDate) return;

        let isMounted = true;
        let isFetchingQuietly = false;

        const fetchQuietly = async () => {
            if (isFetchingQuietly || document.hidden) return;
            isFetchingQuietly = true;

            const dateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
            try {
                const personasPayload = buildPersonasPayload();
                let params: URLSearchParams;
                if (personasPayload) {
                    params = new URLSearchParams({
                        fecha: dateStr,
                        personas: JSON.stringify(personasPayload)
                    });
                } else {
                    const serviciosSecuencia = selectedServices.map(s => {
                        const sIsStaff = s.nombre.toLowerCase().includes('staff') || s.responsable?.toLowerCase() === 'staff';
                        const sIsMile = s.nombre.toLowerCase().includes('mile') || s.responsable?.toLowerCase() === 'mile';
                        let pId = 'c2c0f778-c2fe-4f65-ab37-3b589cb997c2';
                        if (sIsStaff && !sIsMile) pId = 'cc7bdd66-d98e-4c66-ae1d-b975e005bf56';
                        return { profesionalId: pId, duracionMin: s.duracionMin + s.bufferMin };
                    });
                    params = new URLSearchParams({
                        fecha: dateStr,
                        servicios: JSON.stringify(serviciosSecuencia)
                    });
                }

                const res = await fetch(`/api/disponibilidad?${params}`);
                const data = await res.json();
                if (isMounted && data.slots) {
                    setAvailableSlots(data.slots);
                }
            } catch (err) {
                // Ignoramos errores en polling silencioso para no molestar al usuario
            } finally {
                isFetchingQuietly = false;
            }
        };

        const interval = setInterval(fetchQuietly, 15000);
        return () => {
            isMounted = false;
            clearInterval(interval);
        };
    }, [step, selectedDate, selectedServices]);
    // Cargar días disponibles del mes al entrar al Step 2 o cambiar mes
    const fetchMonthAvailability = useCallback(async () => {
        // Cargar días bloqueados globales o por empleado
        try {
            const res = await fetch('/api/dias-bloqueados');
            if (res.ok) {
                const json = await res.json();
                setDiasBloqueadosCargados(json.data || []);
            }
        } catch (e) {
            console.error("Error al cargar días bloqueados:", e);
        }
        setLoadingDays(false);
    }, []);

    // Trigger: entrar al step 2 o cambiar mes
    useEffect(() => {
        if (step === 2) {
            fetchMonthAvailability();
        }
    }, [step, year, month, fetchMonthAvailability]);

    // Limpiar bloqueo huérfano en caso de recarga de página y al salir
    useEffect(() => {
        const orphanedLock = sessionStorage.getItem('lola_lock_id');
        if (orphanedLock) {
            fetch(`/api/bloqueo-temporal?id=${orphanedLock}`, { method: 'DELETE', keepalive: true })
                .catch(() => { });
            sessionStorage.removeItem('lola_lock_id');
        }

        const handleBeforeUnload = () => {
            const currentLock = sessionStorage.getItem('lola_lock_id');
            if (currentLock) {
                fetch(`/api/bloqueo-temporal?id=${currentLock}`, { method: 'DELETE', keepalive: true });
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, []);


    // ─── DÍAS VÁLIDOS SEGÚN PROFESIONALES SELECCIONADOS ───────────────────────
    // 0=Dom, 1=Lun, 2=Mar, 3=Mié, 4=Jue, 5=Vie, 6=Sáb
    const DIAS_MILE = new Set([1, 2, 3, 4, 5, 6]); // Lunes a Sábado (atención total)
    const DIAS_STAFF = new Set([2, 4, 6]); // Martes, Jueves, Sábado (exclusivo Staff)

    const requiredProfIds = new Set(selectedServices.map(s => {
        const sIsStaff = s.nombre.toLowerCase().includes('staff') || s.responsable?.toLowerCase() === 'staff';
        const sIsMile = s.nombre.toLowerCase().includes('mile') || s.responsable?.toLowerCase() === 'mile';
        if (sIsStaff && !sIsMile) return 'cc7bdd66-d98e-4c66-ae1d-b975e005bf56'; // Staff
        return 'c2c0f778-c2fe-4f65-ab37-3b589cb997c2'; // Mile
    }));

    const tieneMile = requiredProfIds.has('c2c0f778-c2fe-4f65-ab37-3b589cb997c2');
    const tieneStaff = requiredProfIds.has('cc7bdd66-d98e-4c66-ae1d-b975e005bf56');

    // Calcular los días de semana habilitados
    const diasHabilitados = (() => {
        if (tieneMile && tieneStaff) {
            // Combo: ambos servicios en días de Staff (porque Mile se hace primero, luego Staff)
            return DIAS_STAFF;
        }
        if (tieneMile) return DIAS_MILE;
        if (tieneStaff) return DIAS_STAFF;
        // Sin servicios seleccionados: mostrar todos excepto domingo
        return new Set([1, 2, 3, 4, 5, 6]);
    })();

    const isDayEnabled = (dayOfWeek: number, dayDateStr: string) => {
        if (!diasHabilitados.has(dayOfWeek)) return false;
        
        // Verificar días bloqueados
        const bloqueosDelDia = diasBloqueadosCargados.filter(d => d.fecha === dayDateStr);
        if (bloqueosDelDia.length > 0) {
            const mileId = 'c2c0f778-c2fe-4f65-ab37-3b589cb997c2';
            const staffId = 'cc7bdd66-d98e-4c66-ae1d-b975e005bf56';
            if (tieneMile && bloqueosDelDia.some(b => b.profesional_id === mileId)) return false;
            if (tieneStaff && bloqueosDelDia.some(b => b.profesional_id === staffId)) return false;
        }
        return true;
    };
    // ──────────────────────────────────────────────────────────────────────────

    const calendarDays = [];
    for (let i = 0; i < firstDayOffset; i++) calendarDays.push(<div key={`empty-${i}`} className="h-10"></div>);

    for (let day = 1; day <= daysInMonth; day++) {
        const dateObj = new Date(year, month, day);
        const dayOfWeek = dateObj.getDay();
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const isPast = dateObj < new Date(new Date().setHours(0, 0, 0, 0));
        const isDisabled = isPast || !isDayEnabled(dayOfWeek, dateStr);
        const isSelected = selectedDate?.getDate() === day && selectedDate?.getMonth() === month;

        calendarDays.push(
            <button
                key={`day-${day}`}
                onClick={() => !isDisabled ? handleSelectDate(day) : undefined}
                disabled={isDisabled}
                className={`h-10 w-full rounded-lg flex items-center justify-center font-medium transition-all relative text-sm
          ${isSelected
                        ? 'bg-gold text-black shadow-[0_0_15px_rgba(212,175,55,0.5)] font-bold scale-110 z-10'
                        : isDisabled
                            ? 'bg-bg-base/20 text-text-muted cursor-not-allowed opacity-30'
                            : 'bg-bg-surface hover:border hover:border-gold/50 text-text-primary hover:text-gold cursor-pointer'
                    }
        `}
            >
                {day}
            </button>
        );
    }

    // --- LÓGICA DE SWAP A STAFF (Modal VIP) ---
    const canSwapToStaff = mileToStaffSwaps.some(swap => !!swap.staffVersion);
    const staffSavings = mileToStaffSwaps.reduce((sum, swap) => {
        if (swap.staffVersion) {
            return sum + (swap.current.precio - swap.staffVersion.precio);
        }
        return sum;
    }, 0);

    const handleCambiarAStaff = () => {
        const newSelectedServices = selectedServices.map(srv => {
            const swap = mileToStaffSwaps.find(s => s.current.id === srv.id);
            return swap?.staffVersion ? { ...swap.staffVersion, uid: srv.uid } : srv;
        });

        setSelectedServices(newSelectedServices);
        setVipFeeAccepted(false);
        if (pendingVipDay) {
            setSelectedDate(new Date(year, month, pendingVipDay));
            setSelectedTime(null);
        }
        setPendingVipDay(null);
    };
    // ------------------------------

    // --- VALIDACIONES PASO 3 ---
    const isEmailValid = clientData.email.trim() === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientData.email);
    const isPhoneValid = clientData.telefono.trim() === '' ? false : (codigoPais === '+57' ? phoneDigits.length === 10 : phoneDigits.length >= 8);
    const isCedulaValid = clientData.cedula.trim() === '' ? false : /^\d{5,15}$/.test(clientData.cedula.replace(/\D/g, ''));
    const isPhoneAmigaValid = datosAmiga.telefono.trim() === '' ? false : (codigoPaisAmiga === '+57' ? phoneDigitsAmiga.length === 10 : phoneDigitsAmiga.length >= 8);
    const isStep3Valid = clientData.nombre.trim() !== '' &&
        clientData.cumpleanos !== '' &&
        isEmailValid &&
        isPhoneValid &&
        isCedulaValid &&
        (!esReservaCompartida || (datosAmiga.nombre.trim() !== '' && isPhoneAmigaValid));

    return (
        <div className="min-h-screen bg-bg-base text-text-primary font-sans flex flex-col relative overflow-hidden pb-24">
            {/* Background Glows */}
            <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-gold/5 rounded-full blur-[120px] pointer-events-none fixed"></div>

            {/* Header Fijo */}
            <header className="w-full p-6 flex items-center justify-between border-b border-border-subtle bg-bg-card/80 backdrop-blur-md sticky top-0 z-50">
                <Link href="/" className="flex items-center gap-2">
                    <span className="font-bold text-xl tracking-widest uppercase text-transparent bg-clip-text bg-gradient-to-r from-gold-light via-gold to-gold-dark">MILE ALMANZA</span>
                </Link>
                <div className="text-sm font-semibold text-text-muted flex items-center gap-2">
                    {step === 0 ? (
                        <span className="text-gold uppercase tracking-wider text-xs font-bold">Condiciones de Reserva</span>
                    ) : (
                        <>Paso <span className="text-gold">{step}</span> de 4</>
                    )}
                </div>
            </header>

            {/* Timer Banner de Pre-Agenda */}
            {step > 2 && timeLeftStr && !isConfirmed && (
                <div className="w-full bg-rose-500/10 border-b border-rose-500/20 px-4 py-2.5 flex items-center justify-center gap-2 text-rose-400 text-xs md:text-sm font-semibold tracking-wide animate-in slide-in-from-top-2 z-40 relative">
                    <Clock className="w-4 h-4 animate-pulse" />
                    <span>Espacio reservado temporalmente. Tienes <span className="font-bold tabular-nums">{timeLeftStr}</span> para confirmar.</span>
                </div>
            )}

            {/* Main Content */}
            <main className="flex-1 w-full max-w-[1400px] mx-auto p-6 md:p-12 relative z-10">

                {/* Progress Bar */}
                {step > 0 && (
                    <div className="flex items-center justify-between mb-12 relative">
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-bg-elevated -z-10 rounded-full">
                            <div className="h-full bg-gold transition-all duration-500 ease-out rounded-full" style={{ width: `${((step - 1) / 3) * 100}%` }}></div>
                        </div>

                        {["Servicio", "Fecha", "Datos", "Confirmar"].map((label, i) => (
                            <div key={label} className="flex flex-col items-center gap-2">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 ${step > i + 1 ? "bg-gold text-black" : step === i + 1 ? "bg-gold text-black shadow-[0_0_15px_rgba(212,175,55,0.5)] ring-4 ring-gold/20" : "bg-bg-elevated text-text-muted border border-border-subtle"
                                    }`}>
                                    {step > i + 1 ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                                </div>
                                <span className={`text-xs font-semibold ${step >= i + 1 ? "text-gold" : "text-text-muted"} hidden sm:block`}>{label}</span>
                            </div>
                        ))}
                    </div>
                )}

                <div className="animate-in slide-in-from-right-8 fade-in duration-500">

                    {/* STEP 0: REGLAS DE AGENDAMIENTO */}
                    {step === 0 && (
                        <>
                            <div className="max-w-2xl mx-auto py-4 px-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="bg-bg-card border border-gold/30 rounded-3xl p-6 md:p-10 shadow-[0_0_50px_rgba(212,175,55,0.12)] relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-gold/5 to-transparent rounded-bl-full pointer-events-none" />

                                    <div className="flex flex-col items-center text-center mb-8">
                                        <div className="w-16 h-16 rounded-full bg-gold/10 flex items-center justify-center border border-gold/20 mb-4 shadow-[0_0_15px_rgba(212,175,55,0.2)]">
                                            <FileText className="w-8 h-8 text-gold" />
                                        </div>
                                        <h1 className="font-display text-2xl md:text-3xl font-bold text-text-primary mb-2">Reglas de Agendamiento</h1>
                                        <p className="text-text-muted text-sm md:text-base max-w-md">Para ofrecerte una experiencia premium y asegurar tu espacio, lee y acepta nuestras políticas.</p>
                                    </div>

                                    <div className="space-y-5 text-sm md:text-base text-text-secondary mb-8 border-y border-border-subtle py-6">

                                        {/* Depósito obligatorio */}
                                        <div className="flex gap-4 items-start">
                                            <div className="flex-shrink-0 w-11 h-11 md:w-12 md:h-12 rounded-full bg-gold/5 border border-gold/20 flex items-center justify-center">
                                                <Wallet className="w-5 h-5 md:w-6 md:h-6 text-gold" />
                                            </div>
                                            <div className="flex-1">
                                                <h4 className="font-bold text-text-primary mb-1.5 text-base md:text-lg">Depósito Obligatorio (50%)</h4>
                                                <p className="text-sm md:text-base leading-relaxed text-text-muted">
                                                    Al confirmar tu preagenda (completar los pasos del formulario), tienes un <strong>límite de 1 hora</strong> para realizar el depósito del <strong>50%</strong> del costo total (<strong>valor que se descontará del costo final de tu servicio</strong>). Transcurrido este tiempo sin registrar el pago, <strong>el sistema liberará el cupo automáticamente</strong>.
                                                </p>
                                            </div>
                                        </div>

                                        {/* Depósito no reembolsable después de confirmar */}
                                        <div className="flex gap-4 items-start">
                                            <div className="flex-shrink-0 w-11 h-11 md:w-12 md:h-12 rounded-full bg-gold/5 border border-gold/20 flex items-center justify-center">
                                                <Ban className="w-5 h-5 md:w-6 md:h-6 text-gold" />
                                            </div>
                                            <div className="flex-1">
                                                <h4 className="font-bold text-text-primary mb-1.5 text-base md:text-lg">El Depósito NO es Reembolsable</h4>
                                                <p className="text-sm md:text-base leading-relaxed text-text-muted">
                                                    Una vez confirmada tu cita (depósito realizado), en caso de <strong>inasistencia o cancelación tardía</strong> (menos de 24h), <strong>perderás el anticipo sin derecho a reembolso</strong>.
                                                </p>
                                            </div>
                                        </div>

                                        {/* Cancelaciones y reagendamiento */}
                                        <div className="flex gap-4 items-start">
                                            <div className="flex-shrink-0 w-11 h-11 md:w-12 md:h-12 rounded-full bg-gold/5 border border-gold/20 flex items-center justify-center">
                                                <CalendarClock className="w-5 h-5 md:w-6 md:h-6 text-gold" />
                                            </div>
                                            <div className="flex-1">
                                                <h4 className="font-bold text-text-primary mb-1.5 text-base md:text-lg">Cancelaciones con 24h de Anticipación</h4>
                                                <p className="text-sm md:text-base leading-relaxed text-text-muted">
                                                    Si cancelas con mínimo <strong>24 horas de anticipación</strong>, se respeta tu anticipo y <strong>puedes reagendar una vez más</strong> con ese mismo anticipo.
                                                </p>
                                            </div>
                                        </div>

                                        {/* Tolerancia 10 min */}
                                        <div className="flex gap-4 items-start">
                                            <div className="flex-shrink-0 w-11 h-11 md:w-12 md:h-12 rounded-full bg-gold/5 border border-gold/20 flex items-center justify-center">
                                                <Clock className="w-5 h-5 md:w-6 md:h-6 text-gold" />
                                            </div>
                                            <div className="flex-1">
                                                <h4 className="font-bold text-text-primary mb-1.5 text-base md:text-lg">Tolerancia Máxima: 10 Minutos</h4>
                                                <p className="text-sm md:text-base leading-relaxed text-text-muted">
                                                    Te recordamos el tiempo de espera de <strong>10 minutos máximo</strong>. Pasado este tiempo, tu cita queda automáticamente cancelada. El anticipo no es reembolsable. <strong>Trata de estar a tiempo</strong>.
                                                </p>
                                            </div>
                                        </div>

                                        {/* Venir sin maquillaje y sesión de fotos */}
                                        <div className="flex gap-4 items-start">
                                            <div className="flex-shrink-0 w-11 h-11 md:w-12 md:h-12 rounded-full bg-gold/5 border border-gold/20 flex items-center justify-center">
                                                <Camera className="w-5 h-5 md:w-6 md:h-6 text-gold" />
                                            </div>
                                            <div className="flex-1">
                                                <h4 className="font-bold text-text-primary mb-1.5 text-base md:text-lg">Asiste sin Maquillaje</h4>
                                                <p className="text-sm md:text-base leading-relaxed text-text-muted">
                                                    Para servicios de <strong>pestañas y faciales</strong>, te pedimos asistir sin maquillaje. Al finalizar, te daremos un <strong>retoquito de cortesía</strong> para que salgas divina en una <strong>pequeña sesión de fotos gratis</strong>.
                                                </p>
                                            </div>
                                        </div>

                                        {/* Sin acompañantes ni niños */}
                                        <div className="flex gap-4 items-start">
                                            <div className="flex-shrink-0 w-11 h-11 md:w-12 md:h-12 rounded-full bg-gold/5 border border-gold/20 flex items-center justify-center">
                                                <UserX className="w-5 h-5 md:w-6 md:h-6 text-gold" />
                                            </div>
                                            <div className="flex-1">
                                                <h4 className="font-bold text-text-primary mb-1.5 text-base md:text-lg">Sin Acompañantes ni Niños</h4>
                                                <p className="text-sm md:text-base leading-relaxed text-text-muted">
                                                    Asiste a tu cita <strong>sin acompañantes ni niños</strong> para mantener un ambiente tranquilo y profesional.
                                                </p>
                                            </div>
                                        </div>

                                        {/* Ubicación se envía al confirmar */}
                                        <div className="flex gap-4 items-start">
                                            <div className="flex-shrink-0 w-11 h-11 md:w-12 md:h-12 rounded-full bg-gold/5 border border-gold/20 flex items-center justify-center">
                                                <MapPin className="w-5 h-5 md:w-6 md:h-6 text-gold" />
                                            </div>
                                            <div className="flex-1">
                                                <h4 className="font-bold text-text-primary mb-1.5 text-base md:text-lg">Ubicación del Salón</h4>
                                                <p className="text-sm md:text-base leading-relaxed text-text-muted">
                                                    La <strong>ubicación exacta se enviará por WhatsApp al confirmarse tu cita</strong>. Recibirás un recordatorio adicional <strong>2 horas antes</strong> de tu servicio. De igual manera, puedes solicitarla en cualquier momento.
                                                </p>
                                            </div>
                                        </div>

                                    </div>

                                    <label className="flex items-start gap-3 p-4 rounded-xl bg-bg-surface/50 border border-border-subtle cursor-pointer hover:border-gold/30 transition-all select-none mb-6">
                                        <input
                                            type="checkbox"
                                            id="accept-rules"
                                            className="mt-1 accent-gold h-5 w-5 rounded border-gray-300 text-gold focus:ring-gold cursor-pointer"
                                        />
                                        <span className="text-sm md:text-base leading-relaxed text-text-muted">
                                            He leído y acepto todas las <strong>reglas de agendamiento</strong>. Entiendo que el depósito del 50% es obligatorio para asegurar mi cita.
                                        </span>
                                    </label>

                                    <button
                                        onClick={() => {
                                            const chk = document.getElementById('accept-rules') as HTMLInputElement;
                                            if (chk && chk.checked) {
                                                setStep(1);
                                            } else {
                                                setShowRulesError(true);
                                            }
                                        }}
                                        className="w-full py-4 bg-gradient-to-r from-gold-dark via-gold to-gold-light text-black font-bold text-sm md:text-base uppercase tracking-wider rounded-xl shadow-[0_0_20px_rgba(212,175,55,0.3)] hover:shadow-[0_0_30px_rgba(212,175,55,0.5)] transition-all hover:scale-[1.01]"
                                    >
                                        Continuar al Catálogo
                                    </button>
                                </div>
                            </div>

                            {/* MODAL DE ERROR: NO ACEPTÓ LAS REGLAS */}
                            {showRulesError && (
                                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
                                    <div className="bg-bg-card border border-gold/30 rounded-3xl w-full max-w-sm overflow-hidden shadow-[0_0_60px_rgba(212,175,55,0.15)] animate-in slide-in-from-bottom-4 duration-300">
                                        <div className="p-8 flex flex-col items-center text-center gap-4">
                                            <div className="w-16 h-16 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center">
                                                <AlertCircle className="w-8 h-8 text-gold" />
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-bold text-text-primary mb-2">¡Debes aceptar las reglas!</h3>
                                                <p className="text-text-secondary text-sm leading-relaxed">
                                                    Para continuar con tu reserva, es necesario que leas y aceptes nuestras políticas de agendamiento marcando la casilla.
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => setShowRulesError(false)}
                                                className="mt-2 w-full py-3.5 bg-gradient-to-r from-gold-dark via-gold to-gold-light text-black font-bold text-sm uppercase tracking-wider rounded-xl hover:opacity-90 transition-all shadow-[0_0_15px_rgba(212,175,55,0.2)]"
                                            >
                                                Entendido
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {/* STEP 1: SERVICIOS */}
                    {step === 1 && (
                        <div className="space-y-8">
                            {cargandoServicios ? (
                                <div className="flex flex-col items-center justify-center py-20">
                                    <Loader2 className="h-10 w-10 text-gold animate-spin mb-4" />
                                    <p className="text-text-muted font-medium">Preparando el catálogo VIP...</p>
                                </div>
                            ) : (
                                <>
                                    {/* ENCABEZADOS SUPERIORES */}
                                    <div className="w-full animate-fade-in">
                                        {!activeCategory && searchQuery.trim() === "" ? (
                                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
                                                <div className="text-center lg:text-left">
                                                    <h1 className="text-3xl font-bold text-text-primary mb-2">Selecciona tus Servicios</h1>
                                                    <p className="text-text-secondary">Puedes elegir múltiples tratamientos para tu cita.</p>
                                                </div>
                                                <div className="relative w-full lg:w-[380px]">
                                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                                                    <input
                                                        type="text"
                                                        placeholder="Buscar servicio por nombre..."
                                                        value={searchQuery}
                                                        onChange={(e) => setSearchQuery(e.target.value)}
                                                        className="w-full bg-bg-surface border border-border-subtle rounded-xl pl-11 pr-4 py-3.5 text-sm text-text-primary focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-all"
                                                    />
                                                </div>
                                            </div>
                                        ) : searchQuery.trim() !== "" ? (
                                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
                                                <div className="text-center lg:text-left flex-1">
                                                    <h1 className="text-2xl font-bold text-text-primary mb-2">Resultados de Búsqueda</h1>
                                                    <p className="text-text-secondary text-sm">Mostrando servicios que coinciden con "{searchQuery}"</p>
                                                </div>
                                                <div className="relative w-full lg:w-[380px]">
                                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                                                    <input
                                                        type="text"
                                                        placeholder="Buscar servicio por nombre..."
                                                        value={searchQuery}
                                                        onChange={(e) => setSearchQuery(e.target.value)}
                                                        className="w-full bg-bg-surface border border-border-subtle rounded-xl pl-11 pr-10 py-3.5 text-sm text-text-primary focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-all"
                                                    />
                                                    <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary">
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8 animate-in slide-in-from-left-4 fade-in duration-300">
                                                <div>
                                                    <button
                                                        onClick={() => setActiveCategory(null)}
                                                        className="flex items-center gap-2 text-text-secondary hover:text-gold mb-6 font-semibold transition-colors text-sm uppercase tracking-wider group"
                                                    >
                                                        <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Volver a categorías
                                                    </button>

                                                    <div className="flex items-center gap-4">
                                                        <div className="w-12 h-12 rounded-full bg-gold/10 flex items-center justify-center border border-gold/20">
                                                            {activeCategory && getCategoryIcon(activeCategory)}
                                                        </div>
                                                        <div>
                                                            <h2 className="text-2xl font-bold text-text-primary uppercase tracking-widest">
                                                                {categorias.find(c => c.id === activeCategory)?.nombre}
                                                            </h2>
                                                            <p className="text-sm text-text-secondary mt-1">Selecciona uno o más servicios</p>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="relative w-full lg:w-[380px]">
                                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                                                    <input
                                                        type="text"
                                                        placeholder="Buscar en el catálogo..."
                                                        value={searchQuery}
                                                        onChange={(e) => {
                                                            setSearchQuery(e.target.value);
                                                            if (e.target.value.trim() !== '') setActiveCategory(null);
                                                        }}
                                                        className="w-full bg-bg-surface border border-border-subtle rounded-xl pl-11 pr-4 py-3.5 text-sm text-text-primary focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-all"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* CONTENIDO PRINCIPAL (Dos columnas) */}
                                    <div className="flex flex-col lg:flex-row gap-12 lg:gap-16 justify-between items-start relative pt-2">

                                        {/* COLUMNA IZQUIERDA: CATÁLOGO */}
                                        <div className="flex-1 w-full">
                                            {searchQuery.trim() !== "" ? (
                                                <div className="animate-in slide-in-from-bottom-4 fade-in duration-300">
                                                    <div className="grid grid-cols-1 gap-4">
                                                        {categorias.flatMap(c => c.grupos)
                                                            .filter(g => g.nombreBase.toLowerCase().includes(searchQuery.toLowerCase()))
                                                            .map((grupo) => {
                                                                const selectedVariations = selectedServices.filter(s => grupo.servicios.some(v => v.id === s.id));
                                                                const isSelected = selectedVariations.length > 0;

                                                                const minPrice = Math.min(...grupo.servicios.map(s => s.precio));
                                                                const maxPrice = Math.max(...grupo.servicios.map(s => s.precio));
                                                                const priceDisplay = minPrice === maxPrice ? formatCurrency(minPrice) : `Desde ${formatCurrency(minPrice)}`;
                                                                const minDuration = Math.min(...grupo.servicios.map(s => s.duracionMin));
                                                                const abonoDisplay = Math.min(...grupo.servicios.map(s => (s.precio * 0.5)));

                                                                return (
                                                                    <button
                                                                        key={`search-${grupo.nombreBase}`}
                                                                        onClick={() => {
                                                                            if (isSelected) {
                                                                                setSelectedServices(prev => prev.filter(s => !grupo.servicios.some(v => v.id === s.id)));
                                                                            } else {
                                                                                if (grupo.servicios.length === 1) {
                                                                                    toggleService(grupo.servicios[0]);
                                                                                } else {
                                                                                    setConfiguringGroup(grupo);
                                                                                }
                                                                            }
                                                                        }}
                                                                        className={`text-left p-6 rounded-2xl border transition-all duration-300 relative overflow-hidden group flex flex-col md:flex-row md:items-center justify-between gap-4 ${isSelected
                                                                            ? "bg-gold/5 border-gold shadow-[0_0_20px_rgba(212,175,55,0.1)] scale-[1.01]"
                                                                            : "bg-bg-card border-border-subtle hover:border-gold/30 hover:bg-bg-elevated"
                                                                            }`}
                                                                    >
                                                                        <div className="flex items-start gap-4 flex-1">
                                                                            <div className="mt-1 flex-shrink-0 transition-transform duration-300 group-hover:scale-110">
                                                                                {isSelected ? (
                                                                                    <CheckCircle className="w-6 h-6 text-gold drop-shadow-[0_0_8px_rgba(212,175,55,0.8)]" />
                                                                                ) : (
                                                                                    <Circle className="w-6 h-6 text-border-subtle group-hover:text-gold/50 transition-colors" />
                                                                                )}
                                                                            </div>
                                                                            <div>
                                                                                <h3 className={`text-lg font-bold mb-1 transition-colors ${isSelected ? "text-gold" : "text-text-primary group-hover:text-gold/80"}`}>
                                                                                    {grupo.nombreBase}
                                                                                </h3>
                                                                                {grupo.servicios.length > 1 ? (
                                                                                    <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-bg-surface border border-border-subtle text-text-secondary mb-2">
                                                                                        Varias opciones de profesionales
                                                                                    </span>
                                                                                ) : grupo.servicios[0].responsable && (
                                                                                    <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-bg-surface border border-border-subtle text-text-secondary mb-2">
                                                                                        Profesional: {grupo.servicios[0].responsable}
                                                                                    </span>
                                                                                )}
                                                                                <div className="flex items-center gap-4 text-xs font-semibold text-text-muted">
                                                                                    <span className="flex items-center gap-1.5">
                                                                                        <Clock className="w-3.5 h-3.5 text-gold" /> {formatearDuracion(minDuration)}
                                                                                    </span>
                                                                                </div>
                                                                            </div>
                                                                        </div>

                                                                        <div className="text-left md:text-right flex flex-col justify-end pl-10 md:pl-0 border-t md:border-t-0 border-border-subtle pt-3 md:pt-0">
                                                                            <span className="text-text-primary text-xl font-bold mb-1 tracking-wide">{priceDisplay}</span>
                                                                            <div className="flex items-center md:justify-end text-xs gap-1.5">
                                                                                <Info className="w-3.5 h-3.5 text-text-muted" />
                                                                                <span className="text-text-secondary uppercase tracking-wider font-semibold text-[10px]">Abono Requerido:</span>
                                                                                <span className="text-gold font-bold">{formatCurrency(abonoDisplay)}</span>
                                                                            </div>
                                                                        </div>
                                                                    </button>
                                                                );
                                                            })}
                                                        {categorias.flatMap(c => c.grupos).filter(g => g.nombreBase.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
                                                            <div className="text-center py-20 text-text-muted">
                                                                <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                                                <p className="font-semibold text-lg">No encontramos tratamientos</p>
                                                                <p className="text-sm">Intenta con otro término de búsqueda.</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ) : !activeCategory ? (
                                                // VISTA DE CATEGORÍAS (Cuadrícula)
                                                <div className="animate-fade-in">
                                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                                                        {categorias.map((categoria) => (
                                                            <button
                                                                key={categoria.id}
                                                                onClick={() => setActiveCategory(categoria.id)}
                                                                className="flex flex-col items-center justify-center text-center p-4 md:p-6 rounded-3xl bg-bg-card border border-border-subtle hover:border-gold/50 hover:bg-bg-elevated transition-all group shadow-sm hover:shadow-[0_5px_20px_rgba(212,175,55,0.08)] aspect-square relative overflow-hidden"
                                                            >
                                                                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-gold/10 to-transparent rounded-bl-full -mr-4 -mt-4 transition-transform duration-500 group-hover:scale-150 pointer-events-none"></div>

                                                                <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-bg-surface border border-gold/10 flex items-center justify-center mb-4 md:mb-5 group-hover:border-gold/30 group-hover:scale-110 transition-all duration-500 relative z-10 shadow-[0_0_15px_rgba(0,0,0,0.5)]">
                                                                    {getCategoryIcon(categoria.nombre)}
                                                                </div>
                                                                <h3 className="text-xs md:text-sm font-bold text-text-primary uppercase tracking-widest relative z-10 leading-tight">{categoria.nombre}</h3>
                                                                <p className="text-[10px] text-text-muted font-medium mt-2 relative z-10">{categoria.grupos.length} opciones</p>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            ) : (
                                                // VISTA DE SERVICIOS DENTRO DE UNA CATEGORÍA
                                                <div className="animate-in slide-in-from-bottom-4 fade-in duration-300">
                                                    <div className="grid grid-cols-1 gap-4">
                                                        {categorias.find(c => c.id === activeCategory)?.grupos.map((grupo) => {
                                                            const selectedVariations = selectedServices.filter(s => grupo.servicios.some(v => v.id === s.id));
                                                            const isSelected = selectedVariations.length > 0;

                                                            const minPrice = Math.min(...grupo.servicios.map(s => s.precio));
                                                            const maxPrice = Math.max(...grupo.servicios.map(s => s.precio));
                                                            const priceDisplay = minPrice === maxPrice ? formatCurrency(minPrice) : `Desde ${formatCurrency(minPrice)}`;
                                                            const minDuration = Math.min(...grupo.servicios.map(s => s.duracionMin + s.bufferMin));
                                                            const abonoDisplay = Math.min(...grupo.servicios.map(s => (s.precio * 0.5)));

                                                            return (
                                                                <button
                                                                    key={grupo.nombreBase}
                                                                    onClick={() => {
                                                                        if (isSelected) {
                                                                            setSelectedServices(prev => prev.filter(s => !grupo.servicios.some(v => v.id === s.id)));
                                                                        } else {
                                                                            if (grupo.servicios.length === 1) {
                                                                                toggleService(grupo.servicios[0]);
                                                                            } else {
                                                                                setConfiguringGroup(grupo);
                                                                            }
                                                                        }
                                                                    }}
                                                                    className={`text-left p-6 rounded-2xl border transition-all duration-300 relative overflow-hidden group flex flex-col md:flex-row md:items-center justify-between gap-4 ${isSelected
                                                                        ? "bg-gold/5 border-gold shadow-[0_0_20px_rgba(212,175,55,0.1)] scale-[1.01]"
                                                                        : "bg-bg-card border-border-subtle hover:border-gold/30 hover:bg-bg-elevated"
                                                                        }`}
                                                                >
                                                                    <div className="flex items-start gap-4 flex-1">
                                                                        <div className="mt-1 flex-shrink-0 transition-transform duration-300 group-hover:scale-110">
                                                                            {isSelected ? (
                                                                                <CheckCircle className="w-6 h-6 text-gold drop-shadow-[0_0_8px_rgba(212,175,55,0.8)]" />
                                                                            ) : (
                                                                                <Circle className="w-6 h-6 text-border-subtle group-hover:text-gold/50 transition-colors" />
                                                                            )}
                                                                        </div>
                                                                        <div>
                                                                            <h3 className={`text-lg font-bold mb-1 transition-colors ${isSelected ? "text-gold" : "text-text-primary group-hover:text-gold/80"}`}>
                                                                                {grupo.nombreBase}
                                                                            </h3>
                                                                            {grupo.servicios.length > 1 ? (
                                                                                <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-bg-surface border border-border-subtle text-text-secondary mb-2">
                                                                                    Varias opciones de profesional
                                                                                </span>
                                                                            ) : grupo.servicios[0].responsable && (
                                                                                <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-bg-surface border border-border-subtle text-text-secondary mb-2">
                                                                                    Profesional: {grupo.servicios[0].responsable}
                                                                                </span>
                                                                            )}
                                                                            <div className="flex items-center gap-4 text-xs font-semibold text-text-muted">
                                                                                <span className="flex items-center gap-1.5">
                                                                                    <Clock className="w-3.5 h-3.5 text-gold" /> {formatearDuracion(minDuration)}
                                                                                </span>
                                                                            </div>
                                                                        </div>
                                                                    </div>

                                                                    <div className="text-left md:text-right flex flex-col justify-end pl-10 md:pl-0 border-t md:border-t-0 border-border-subtle pt-3 md:pt-0">
                                                                        <span className="text-text-primary text-xl font-bold mb-1 tracking-wide">{priceDisplay}</span>
                                                                        <div className="flex items-center md:justify-end text-xs gap-1.5">
                                                                            <Info className="w-3.5 h-3.5 text-text-muted" />
                                                                            <span className="text-text-secondary uppercase tracking-wider font-semibold text-[10px]">Abono Requerido:</span>
                                                                            <span className="text-gold font-bold">{formatCurrency(abonoDisplay)}</span>
                                                                        </div>
                                                                    </div>
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}
                                        </div> {/* Cierre COLUMNA IZQUIERDA */}

                                        {/* COLUMNA DERECHA: CARRITO ESTILO APUESTAS (FIJO) */}
                                        <div className="w-full lg:w-[380px] lg:sticky lg:top-32 bg-bg-card border border-gold/30 rounded-3xl shadow-[0_0_40px_rgba(212,175,55,0.1)] overflow-hidden flex flex-col flex-shrink-0 animate-in fade-in duration-500">
                                            {/* Header Carrito */}
                                            <div className="p-5 border-b border-border-subtle bg-bg-surface flex justify-between items-center relative overflow-hidden">
                                                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-gold/10 to-transparent rounded-bl-full pointer-events-none"></div>
                                                <h3 className="font-bold text-gold uppercase tracking-widest text-sm flex items-center gap-2 relative z-10">
                                                    <div className="w-7 h-7 rounded-full bg-gold/10 border border-gold/25 flex items-center justify-center">
                                                        <ShoppingCart className="w-3.5 h-3.5 text-gold" />
                                                    </div>
                                                    Tu Reserva
                                                </h3>
                                                <span className="bg-gold/10 border border-gold/20 text-gold px-3 py-1 rounded-md text-xs font-bold relative z-10 shadow-sm">
                                                    {selectedServices.length} {selectedServices.length === 1 ? 'servicio' : 'servicios'}
                                                </span>
                                            </div>

                                            {/* Lista de Selecciones */}
                                            <div className="p-5 max-h-[350px] overflow-y-auto space-y-3 bg-bg-base hide-scrollbar">
                                                {selectedServices.length === 0 ? (
                                                    <div className="text-center py-12 flex flex-col items-center opacity-50">
                                                        <ShoppingCart className="w-10 h-10 text-text-muted mb-3" />
                                                        <p className="text-text-muted text-sm font-medium">Aún no has seleccionado ningún servicio.</p>
                                                    </div>
                                                ) : (
                                                    <>
                                                        {Object.values(
                                                            selectedServices.reduce((acc, srv) => {
                                                                if (!acc[srv.id]) {
                                                                    acc[srv.id] = { ...srv, count: 0, uids: [] };
                                                                }
                                                                acc[srv.id].count++;
                                                                acc[srv.id].uids.push(srv.uid);
                                                                return acc;
                                                            }, {} as Record<string, CartService & { count: number; uids: string[] }>)
                                                        ).map(grp => {
                                                            const baseName = grp.nombre.replace(/ - (Mile|Staff)$/i, '').trim();
                                                            let staffVersion = null;
                                                            let mileVersion = null;
                                                            for (const cat of categorias) {
                                                                const group = cat.grupos.find(g => g.nombreBase === baseName);
                                                                if (group) {
                                                                    staffVersion = group.servicios.find(v => v.responsable === 'Staff' || v.nombre.toLowerCase().includes('- staff'));
                                                                    mileVersion = group.servicios.find(v => v.responsable === 'Mile' || v.nombre.toLowerCase().includes('- mile'));
                                                                    break;
                                                                }
                                                            }
                                                            const hasAlternatives = staffVersion && mileVersion;
                                                            const isCurrentlyMile = grp.responsable === 'Mile' || grp.nombre.toLowerCase().includes('- mile');

                                                            return (
                                                                <div key={grp.id} className="bg-bg-surface border border-white/[0.06] rounded-2xl p-4 hover:border-gold/20 transition-all relative">
                                                                    <button
                                                                        onClick={() => removeServiceGroupFromCart(grp.id)}
                                                                        className="absolute top-4 right-4 text-text-muted hover:text-red-urgency transition-colors p-1 rounded-lg hover:bg-white/[0.04]"
                                                                        title="Quitar todo"
                                                                    >
                                                                        <Trash2 className="w-4 h-4" />
                                                                    </button>
                                                                    <h4 className="text-sm font-bold text-text-primary leading-tight mb-1 pr-7">{hasAlternatives ? baseName : grp.nombre}</h4>
                                                                    <span className="text-xs text-text-muted/60 font-semibold flex items-center gap-1 mb-4">
                                                                        <Clock className="w-2.5 h-2.5 text-gold/70" /> {formatearDuracion(grp.duracionMin + grp.bufferMin)} {grp.count > 1 && `(x${grp.count})`}
                                                                    </span>
                                                                    <div className="flex items-center justify-between pt-3 border-t border-white/[0.05]">
                                                                        <span className="text-base font-bold text-gold">{formatCurrency(grp.precio * grp.count)}</span>
                                                                        <div className="flex items-center gap-3">
                                                                            {hasAlternatives && (
                                                                                <div className="relative flex bg-bg-base border border-white/[0.08] rounded-full p-0.5 shadow-inner overflow-hidden">
                                                                                    {/* Sliding pill */}
                                                                                    <div
                                                                                        className="absolute top-0.5 bottom-0.5 rounded-full transition-all duration-300 ease-in-out"
                                                                                        style={{
                                                                                            left: isCurrentlyMile ? '2px' : '50%',
                                                                                            right: isCurrentlyMile ? '50%' : '2px',
                                                                                            background: 'linear-gradient(135deg, #D4AF37, #F5D770)',
                                                                                            boxShadow: '0 0 10px rgba(212,175,55,0.6)'
                                                                                        }}
                                                                                    />
                                                                                    <button
                                                                                        onClick={() => {
                                                                                            if (!isCurrentlyMile && mileVersion) {
                                                                                                const newSelected = selectedServices.map(s => s.id === grp.id ? { ...mileVersion, uid: s.uid } : s);
                                                                                                setSelectedServices(newSelected as typeof selectedServices);
                                                                                            }
                                                                                        }}
                                                                                        className={`relative z-10 px-3 py-1 text-[9px] font-black tracking-widest rounded-full transition-all duration-300 ${isCurrentlyMile ? 'text-black' : 'text-text-muted/50 hover:text-text-muted'}`}
                                                                                    >
                                                                                        MILE
                                                                                    </button>
                                                                                    <button
                                                                                        onClick={() => {
                                                                                            if (isCurrentlyMile && staffVersion) {
                                                                                                const newSelected = selectedServices.map(s => s.id === grp.id ? { ...staffVersion, uid: s.uid } : s);
                                                                                                setSelectedServices(newSelected as typeof selectedServices);
                                                                                            }
                                                                                        }}
                                                                                        className={`relative z-10 px-3 py-1 text-[9px] font-black tracking-widest rounded-full transition-all duration-300 ${!isCurrentlyMile ? 'text-black' : 'text-text-muted/50 hover:text-text-muted'}`}
                                                                                    >
                                                                                        STAFF
                                                                                    </button>
                                                                                </div>
                                                                            )}
                                                                            <div className="flex items-center gap-2">
                                                                                <button
                                                                                    onClick={() => removeServiceFromCartByUid(grp.uids[grp.uids.length - 1])}
                                                                                    className="w-7 h-7 flex items-center justify-center rounded-full bg-bg-base border border-border-subtle text-text-muted hover:text-red-urgency hover:border-red-urgency/50 transition-colors"
                                                                                >
                                                                                    <Minus className="w-3 h-3" />
                                                                                </button>
                                                                                <span className="text-sm font-bold text-text-primary min-w-[20px] text-center">{grp.count}</span>
                                                                                <button
                                                                                    onClick={() => addServiceToCart(grp)}
                                                                                    className="w-7 h-7 flex items-center justify-center rounded-full bg-gold/10 border border-gold/30 text-gold hover:bg-gold/20 hover:border-gold/50 transition-colors"
                                                                                >
                                                                                    <Plus className="w-3 h-3" />
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )
                                                        })}

                                                        {vipFee > 0 && (
                                                            <div className="bg-gold/10 border border-gold/30 rounded-2xl p-4 relative group">
                                                                <h4 className="text-sm font-bold text-gold pr-8 leading-tight mb-2 flex items-center gap-2">
                                                                    <Crown className="w-4 h-4" /> Pase VIP (Staff Day)
                                                                </h4>
                                                                <div className="flex justify-between items-end">
                                                                    <span className="text-xs text-text-muted font-semibold flex items-center gap-1">
                                                                        Exclusividad Mile
                                                                    </span>
                                                                    <span className="text-sm font-bold text-gold">{formatCurrency(vipFee)}</span>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </>
                                                )}
                                            </div>

                                            {/* Totales y Checkout */}
                                            <div className="p-5 bg-bg-card border-t border-border-subtle space-y-4">
                                                <div className="space-y-2 mb-4">
                                                    <div className="flex justify-between items-center text-sm">
                                                        <span className="text-text-secondary font-semibold">Tiempo Total</span>
                                                        <span className="font-bold text-text-primary flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-gold" /> {formatearDuracion(totalDuracion)}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center text-sm">
                                                        <span className="text-text-secondary font-semibold">Costo Total</span>
                                                        <span className="font-bold text-text-primary">{formatCurrency(totalPrecio)}</span>
                                                    </div>
                                                </div>

                                                <div className="flex justify-between items-center bg-gold/[0.06] border border-gold/20 rounded-2xl px-4 py-3.5 my-3">
                                                    <div>
                                                        <span className="text-[9px] font-black text-gold/60 uppercase tracking-[2.5px] block">Abono Requerido</span>
                                                        <span className="text-[9px] text-gold/40 uppercase tracking-widest">Para confirmar cita</span>
                                                    </div>
                                                    <span className="font-extrabold text-gold text-2xl tracking-tight">{formatCurrency(totalAbono)}</span>
                                                </div>

                                                {/* Toggle Reserva Compartida */}
                                                {selectedServices.length >= 2 && (
                                                    <button
                                                        onClick={() => {
                                                            setEsReservaCompartida(!esReservaCompartida);
                                                            if (esReservaCompartida) {
                                                                setServiciosAmiga([]);
                                                                setDatosAmiga({ nombre: '', telefono: '' });
                                                            }
                                                        }}
                                                        className={`w-full py-3 rounded-xl border text-sm font-bold transition-all flex items-center justify-center gap-2 mb-3 ${esReservaCompartida
                                                            ? 'bg-gold/10 border-gold text-gold shadow-[0_0_15px_rgba(212,175,55,0.2)]'
                                                            : 'bg-bg-surface border-border-subtle text-text-secondary hover:border-gold/30 hover:text-gold'
                                                            }`}
                                                    >
                                                        <Users className="w-4 h-4" />
                                                        {esReservaCompartida ? '✓ Reserva para 2 personas' : '¿Vas con una amiga?'}
                                                    </button>
                                                )}

                                                {/* Asignar servicios a la amiga */}
                                                {esReservaCompartida && selectedServices.length >= 2 && (
                                                    <div className="mb-3 bg-bg-surface border border-gold/20 rounded-2xl p-4 space-y-2">
                                                        <p className="text-xs text-text-muted uppercase tracking-wider font-bold flex items-center gap-2 mb-1">
                                                            <UserPlus className="w-3.5 h-3.5 text-gold" /> Asigna cada servicio
                                                        </p>
                                                        <p className="text-[10px] text-text-muted leading-relaxed mb-3">Toca un servicio para asignarlo a tu amiga. También puedes elegir el profesional de cada una:</p>
                                                        {selectedServices.map(srv => {
                                                            const isAmiga = serviciosAmiga.some(a => a.uid === srv.uid);
                                                            const srvBaseName = srv.nombre.replace(/ - (Mile|Staff)$/i, '').trim();
                                                            let srvStaffVersion = null;
                                                            let srvMileVersion = null;
                                                            for (const cat of categorias) {
                                                                const group = cat.grupos.find(g => g.nombreBase === srvBaseName);
                                                                if (group) {
                                                                    srvStaffVersion = group.servicios.find(v => v.responsable === 'Staff' || v.nombre.toLowerCase().includes('- staff'));
                                                                    srvMileVersion = group.servicios.find(v => v.responsable === 'Mile' || v.nombre.toLowerCase().includes('- mile'));
                                                                    break;
                                                                }
                                                            }
                                                            const srvHasAlt = srvStaffVersion && srvMileVersion;
                                                            const srvIsMile = srv.responsable === 'Mile' || srv.nombre.toLowerCase().includes('- mile');
                                                            return (
                                                                <div
                                                                    key={`amiga-${srv.uid}`}
                                                                    className={`rounded-2xl border transition-all duration-200 overflow-hidden ${isAmiga ? 'border-gold/40 bg-gold/5' : 'border-border-subtle bg-bg-base'}`}
                                                                >
                                                                    <button
                                                                        onClick={() => {
                                                                            if (isAmiga) {
                                                                                setServiciosAmiga(prev => prev.filter(a => a.uid !== srv.uid));
                                                                            } else {
                                                                                setServiciosAmiga(prev => [...prev, srv]);
                                                                            }
                                                                        }}
                                                                        className="w-full text-left px-3 py-2.5 text-xs font-semibold flex items-center justify-between gap-2"
                                                                    >
                                                                        <span className={`flex items-center gap-2 ${isAmiga ? 'text-gold' : 'text-text-secondary'}`}>
                                                                            <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all duration-200 flex-shrink-0 ${isAmiga ? 'bg-gold border-gold' : 'border-text-muted/40'}`}>
                                                                                {isAmiga && <span className="w-1.5 h-1.5 rounded-full bg-black" />}
                                                                            </span>
                                                                            <span>{srvHasAlt ? srvBaseName : srv.nombre}</span>
                                                                        </span>
                                                                        <span className={`font-bold flex-shrink-0 ${isAmiga ? 'text-gold' : 'text-text-muted'}`}>{formatCurrency(srv.precio)}</span>
                                                                    </button>
                                                                    {/* Toggle profesional por servicio */}
                                                                    {srvHasAlt && (
                                                                        <div className="px-3 pb-2.5 flex items-center gap-2">
                                                                            <span className="text-[9px] text-text-muted uppercase tracking-wider font-bold">Con:</span>
                                                                            <div className="relative flex bg-black/20 border border-white/[0.06] rounded-full p-0.5 overflow-hidden">
                                                                                <div
                                                                                    className="absolute top-0.5 bottom-0.5 rounded-full transition-all duration-300 ease-in-out"
                                                                                    style={{
                                                                                        left: srvIsMile ? '2px' : '50%',
                                                                                        right: srvIsMile ? '50%' : '2px',
                                                                                        background: 'linear-gradient(135deg, #D4AF37, #F5D770)',
                                                                                        boxShadow: '0 0 10px rgba(212,175,55,0.6)'
                                                                                    }}
                                                                                />
                                                                                <button
                                                                                    onClick={() => {
                                                                                        if (!srvIsMile && srvMileVersion) {
                                                                                            const updated = { ...srvMileVersion, uid: srv.uid } as CartService;
                                                                                            setSelectedServices(prev => prev.map(s => s.uid === srv.uid ? updated : s));
                                                                                            if (isAmiga) setServiciosAmiga(prev => prev.map(a => a.uid === srv.uid ? updated : a));
                                                                                        }
                                                                                    }}
                                                                                    className={`relative z-10 px-3 py-0.5 text-[8px] font-black tracking-widest rounded-full transition-all duration-300 ${srvIsMile ? 'text-black' : 'text-text-muted/50 hover:text-text-muted'}`}
                                                                                >
                                                                                    MILE
                                                                                </button>
                                                                                <button
                                                                                    onClick={() => {
                                                                                        if (srvIsMile && srvStaffVersion) {
                                                                                            const updated = { ...srvStaffVersion, uid: srv.uid } as CartService;
                                                                                            setSelectedServices(prev => prev.map(s => s.uid === srv.uid ? updated : s));
                                                                                            if (isAmiga) setServiciosAmiga(prev => prev.map(a => a.uid === srv.uid ? updated : a));
                                                                                        }
                                                                                    }}
                                                                                    className={`relative z-10 px-3 py-0.5 text-[8px] font-black tracking-widest rounded-full transition-all duration-300 ${!srvIsMile ? 'text-black' : 'text-text-muted/50 hover:text-text-muted'}`}
                                                                                >
                                                                                    STAFF
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                        {serviciosAmiga.length > 0 && serviciosTitular.length === 0 && (
                                                            <p className="text-[10px] text-rose-400 font-semibold mt-2">⚠ Debes dejar al menos 1 servicio para ti.</p>
                                                        )}
                                                    </div>
                                                )}

                                                <button
                                                    disabled={selectedServices.length === 0 || (esReservaCompartida && (serviciosAmiga.length === 0 || serviciosTitular.length === 0))}
                                                    onClick={nextStep}
                                                    className="w-full py-4 bg-gradient-to-r from-gold-dark via-gold to-gold-light text-black rounded-xl font-bold uppercase tracking-wider text-sm disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed shadow-[0_0_20px_rgba(212,175,55,0.4)] hover:shadow-[0_0_30px_rgba(212,175,55,0.6)] transition-all flex items-center justify-center gap-2"
                                                >
                                                    Agendar Fecha <ArrowRight className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {/* MODAL: RESERVA EN GRUPO (3+ cupos) */}
                    {showGrupoModal && (
                        <div
                            className="fixed inset-0 z-[100] flex items-center justify-center p-5 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
                            onClick={() => setShowGrupoModal(false)}
                        >
                            <div
                                className="w-full max-w-sm bg-bg-card rounded-3xl overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.6)] animate-in zoom-in-95 duration-200"
                                onClick={e => e.stopPropagation()}
                            >
                                {/* Línea dorada top */}
                                <div className="h-px bg-gradient-to-r from-transparent via-gold/60 to-transparent" />

                                <div className="px-6 py-7 flex flex-col items-center text-center gap-4">
                                    {/* Icono */}
                                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-gold/20 via-gold/8 to-transparent border border-gold/25 flex items-center justify-center shadow-[0_0_20px_rgba(212,175,55,0.15)]">
                                        <Crown className="w-6 h-6 text-gold drop-shadow-[0_0_6px_rgba(212,175,55,0.8)]" />
                                    </div>

                                    {/* Texto */}
                                    <div className="space-y-1.5">
                                        <p className="text-[10px] uppercase tracking-[0.2em] text-gold/60 font-semibold">Experiencia Grupal</p>
                                        <h3 className="text-xl font-bold text-text-primary">Reserva en Grupo</h3>
                                        <p className="text-text-secondary text-sm leading-relaxed">
                                            Para <span className="text-text-primary font-semibold">3 o más cupos</span>{grupoModalServicio ? <> de <span className="text-gold font-semibold">{grupoModalServicio}</span></> : ''}, lo coordinamos directo contigo para asegurar los horarios de todo el grupo. 💛
                                        </p>
                                    </div>

                                    {/* Botones */}
                                    <div className="flex flex-col gap-2.5 w-full pt-1">
                                        <a
                                            href={`https://wa.me/${(configData?.whatsapp_numero || '573043908714').replace(/\D/g, '')}?text=${encodeURIComponent(`Hola 👋 Quiero coordinar una reserva grupal para *${grupoModalServicio || 'un servicio'}*. Somos 3 o más personas. ¿Cuándo tienen disponibilidad?`)}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={() => setShowGrupoModal(false)}
                                            className="w-full py-4 bg-gradient-to-r from-gold-dark via-gold to-gold-light text-black rounded-2xl font-bold text-sm flex items-center justify-center gap-2.5 transition-all duration-300 shadow-[0_0_20px_rgba(212,175,55,0.35)] hover:shadow-[0_0_35px_rgba(212,175,55,0.55)] active:scale-[0.98]"
                                        >
                                            <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                                                <path d="M12 0C5.373 0 0 5.373 0 12c0 2.126.554 4.121 1.523 5.855L.057 23.928l6.233-1.636A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.007-1.373l-.36-.213-3.7.971.988-3.606-.235-.372A9.818 9.818 0 1112 21.818z"/>
                                            </svg>
                                            Escribirnos ahora
                                        </a>
                                        <button
                                            onClick={() => setShowGrupoModal(false)}
                                            className="w-full py-3 text-text-muted/50 font-medium text-sm hover:text-text-muted transition-colors"
                                        >
                                            Continuar con mi reserva
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}



                    {/* MODAL: TIEMPO EXPIRADO */}

                    {showExpiredModal && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
                            <div className="bg-bg-card border border-amber-500/40 rounded-3xl w-full max-w-sm overflow-hidden shadow-[0_0_60px_rgba(245,158,11,0.2)] animate-in slide-in-from-bottom-4 duration-300">
                                <div className="p-8 flex flex-col items-center text-center gap-4">
                                    <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
                                        <Clock className="w-8 h-8 text-amber-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-text-primary mb-2">Tiempo expirado</h3>
                                        <p className="text-text-secondary text-sm leading-relaxed">
                                            Tu reserva temporal venció por inactividad. No te preocupes, simplemente selecciona una nueva hora para continuar.
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setShowExpiredModal(false)}
                                        className="mt-2 w-full py-3.5 bg-gradient-to-r from-amber-600 to-amber-400 text-black font-bold text-sm uppercase tracking-wider rounded-xl hover:opacity-90 transition-all"
                                    >
                                        Elegir otra hora
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* MODAL: HORARIO TOMADO (409) */}
                    {showConflictModal && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
                            <div className="bg-bg-card border border-rose-500/40 rounded-3xl w-full max-w-sm overflow-hidden shadow-[0_0_60px_rgba(244,63,94,0.2)] animate-in slide-in-from-bottom-4 duration-300">
                                <div className="p-8 flex flex-col items-center text-center gap-4">
                                    <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center">
                                        <AlertCircle className="w-8 h-8 text-rose-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-text-primary mb-2">¡Ups, ya lo tomaron!</h3>
                                        <p className="text-text-secondary text-sm leading-relaxed">
                                            Alguien más acaba de reservar ese horario justo ahora. Hemos actualizado la disponibilidad, elige otro espacio.
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setShowConflictModal(false)}
                                        className="mt-2 w-full py-3.5 bg-gradient-to-r from-rose-700 to-rose-500 text-white font-bold text-sm uppercase tracking-wider rounded-xl hover:opacity-90 transition-all"
                                    >
                                        Ver otros horarios
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* MODAL: ERROR GENERAL */}
                    {showErrorModal && (
                        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
                            <div className="bg-bg-card border border-rose-500/40 rounded-3xl w-full max-w-sm overflow-hidden shadow-[0_0_60px_rgba(244,63,94,0.2)] animate-in slide-in-from-bottom-4 duration-300">
                                <div className="p-8 flex flex-col items-center text-center gap-4">
                                    <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center">
                                        <AlertCircle className="w-8 h-8 text-rose-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-text-primary mb-2">¡Algo salió mal!</h3>
                                        <p className="text-text-secondary text-sm leading-relaxed">
                                            {errorModalMsg}
                                        </p>
                                    </div>
                                    {errorModalMsg.includes('Actualmente tienes una reserva pendiente de pago') && (
                                        <Link
                                            href="/mis-citas"
                                            className="w-full mt-2 py-3.5 bg-gold/10 text-gold border border-gold/30 font-bold text-sm uppercase tracking-wider rounded-xl hover:bg-gold/20 transition-all flex items-center justify-center gap-2 mb-2"
                                        >
                                            <Calendar className="w-4 h-4" /> Ir a Mis Citas
                                        </Link>
                                    )}
                                    <button
                                        onClick={() => setShowErrorModal(false)}
                                        className="mt-2 w-full py-3.5 bg-bg-surface border border-border-subtle text-text-primary font-bold text-sm uppercase tracking-wider rounded-xl hover:bg-bg-elevated transition-all"
                                    >
                                        Entendido
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* MODAL PARA SELECCIONAR PROFESIONAL (CUANDO HAY VERSIONES DE MILE Y STAFF) */}
                    {configuringGroup && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
                            <div className="bg-bg-card border border-gold/30 rounded-3xl w-full max-w-md overflow-hidden shadow-[0_0_50px_rgba(212,175,55,0.15)] flex flex-col">
                                <div className="p-6 border-b border-border-subtle flex justify-between items-center bg-bg-surface">
                                    <h3 className="text-xl font-bold text-text-primary">Opciones de Profesional</h3>
                                    <button onClick={() => setConfiguringGroup(null)} className="p-2 hover:bg-bg-base rounded-full transition-colors"><X className="w-5 h-5 text-text-muted" /></button>
                                </div>

                                <div className="p-6 flex flex-col gap-4">
                                    <p className="text-sm text-text-secondary mb-2">Selecciona con quién te gustaría agendar <span className="font-bold text-gold">{configuringGroup.nombreBase}</span></p>

                                    {configuringGroup.servicios.map(srv => {
                                        const isMile = srv.nombre.toLowerCase().includes('- mile');
                                        const isStaff = srv.nombre.toLowerCase().includes('- staff');
                                        const profName = isMile ? 'Mile (Master)' : (isStaff ? 'Staff VIP' : srv.responsable || 'Profesional');
                                        const days = isMile ? 'Lunes, Miércoles, Viernes' : (isStaff ? 'Martes, Jueves, Sábado' : 'Sujeto a disponibilidad');

                                        return (
                                            <button key={srv.id} onClick={() => { toggleService(srv); setConfiguringGroup(null); }} className="flex flex-col text-left p-5 rounded-2xl border border-border-subtle hover:border-gold/50 hover:bg-gold/5 transition-all group">
                                                <div className="flex justify-between items-start w-full mb-2">
                                                    <h4 className="text-lg font-bold text-text-primary group-hover:text-gold transition-colors">{profName}</h4>
                                                    <span className="text-lg font-bold text-gold">{formatCurrency(srv.precio)}</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-xs text-text-muted mb-3">
                                                    <Calendar className="w-3.5 h-3.5 text-gold/70" />
                                                    <span>Atiende: <span className="font-semibold text-text-secondary">{days}</span></span>
                                                </div>
                                                <div className="flex items-center gap-4 text-[10px] uppercase tracking-wider font-semibold">
                                                    <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-text-muted" /> {formatearDuracion(srv.duracionMin + srv.bufferMin)}</span>
                                                    <span className="flex items-center gap-1 text-gold/80"><Info className="w-3 h-3" /> Abono: {formatCurrency(srv.precio * 0.5)}</span>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 2: CALENDARIO */}
                    {step === 2 && (
                        <div className="space-y-8">
                            <div className="text-center mb-8">
                                <h1 className="text-3xl font-bold text-text-primary mb-2">¿Cuándo te esperamos?</h1>
                                <p className="text-text-secondary">
                                    Tiempo requerido para tu cita: <span className="text-gold font-semibold">{formatearDuracion(totalDuracion)}</span>
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-bg-card p-6 rounded-3xl border border-border-subtle shadow-2xl">
                                {/* Calendario */}
                                <div>
                                    <div className="flex items-center justify-between mb-6">
                                        <h2 className="font-bold text-text-primary flex items-center gap-2 uppercase tracking-wide">
                                            {monthNames[month]} {year}
                                        </h2>
                                        <div className="flex gap-2">
                                            <button onClick={() => { setCurrentDate(new Date(year, month - 1, 1)); setSelectedDate(null); setSelectedTime(null); }} className="p-1.5 rounded-md bg-bg-surface border border-border-subtle hover:border-gold/50 text-text-secondary"><ArrowLeft className="w-4 h-4" /></button>
                                            <button onClick={() => { setCurrentDate(new Date(year, month + 1, 1)); setSelectedDate(null); setSelectedTime(null); }} className="p-1.5 rounded-md bg-bg-surface border border-border-subtle hover:border-gold/50 text-text-secondary"><ArrowRight className="w-4 h-4" /></button>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-7 gap-1 mb-2 text-center text-xs text-text-muted font-bold uppercase">
                                        {["L", "M", "X", "J", "V", "S", "D"].map(d => <div key={d}>{d}</div>)}
                                    </div>
                                    <div className="grid grid-cols-7 gap-1">
                                        {calendarDays}
                                    </div>
                                </div>

                                {/* Horarios */}
                                <div className="border-t md:border-t-0 md:border-l border-border-subtle pt-6 md:pt-0 md:pl-8 flex flex-col">
                                    <h3 className="font-bold text-text-primary mb-4 flex items-center gap-2 uppercase tracking-wide text-sm">
                                        <Clock className="w-4 h-4 text-gold" />
                                        Horarios Libres
                                    </h3>

                                    {!selectedDate ? (
                                        <div className="flex-1 flex items-center justify-center text-text-muted text-sm text-center">
                                            Selecciona un día para ver los horarios.
                                        </div>
                                    ) : loadingSlots ? (
                                        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-text-muted text-sm py-8">
                                            <Loader2 className="w-8 h-8 text-gold animate-spin" />
                                            <span>Consultando disponibilidad...</span>
                                        </div>
                                    ) : slotsError ? (
                                        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-sm text-center p-4 bg-red-urgency/5 rounded-xl border border-red-urgency/20">
                                            <AlertCircle className="w-6 h-6 text-red-urgency" />
                                            <span className="text-red-urgency font-medium">{slotsError}</span>
                                            <button onClick={() => selectedDate && handleSelectDate(selectedDate.getDate(), true)} className="text-gold underline text-xs">Reintentar</button>
                                        </div>
                                    ) : availableSlots.length === 0 ? (
                                        <div className="flex-1 flex flex-col items-center justify-center gap-4 py-8 px-4 text-center">
                                            <div className="relative">
                                                <div className="absolute inset-0 rounded-full bg-rose-500/20 blur-xl scale-150 animate-pulse" />
                                                <div className="relative w-16 h-16 rounded-full bg-bg-surface border border-rose-500/30 flex items-center justify-center shadow-[0_0_20px_rgba(244,63,94,0.15)]">
                                                    <Calendar className="w-7 h-7 text-rose-400" />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <p className="font-bold text-text-primary text-lg">Sin cupos disponibles</p>
                                                <p className="text-text-muted text-sm leading-relaxed max-w-[220px] mx-auto">
                                                    Este día ya está completo.<br />Prueba con otra fecha
                                                </p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {([
                                                { key: 'Mañana', label: 'Mañana', range: '9:00 AM – 11:59 AM', slots: availableSlots.filter(t => parseInt(t.split(':')[0]) < 12) },
                                                { key: 'Tarde', label: 'Tarde', range: '12:00 PM – 5:59 PM', slots: availableSlots.filter(t => { const h = parseInt(t.split(':')[0]); return h >= 12 && h < 18; }) },
                                                { key: 'Noche', label: 'Noche', range: '6:00 PM – cierre', slots: availableSlots.filter(t => parseInt(t.split(':')[0]) >= 18) }
                                            ] as { key: string; label: string; range: string; slots: string[] }[]).map(section => {
                                                // Evitar que el slot seleccionado desaparezca de la UI si el polling lo detecta como "ocupado" (porque nosotros mismos lo bloqueamos)
                                                if (selectedTime) {
                                                    const h = parseInt(selectedTime.split(':')[0]);
                                                    const isThisSection = (section.key === 'Mañana' && h < 12) || (section.key === 'Tarde' && h >= 12 && h < 18) || (section.key === 'Noche' && h >= 18);
                                                    if (isThisSection && !section.slots.includes(selectedTime)) {
                                                        section.slots.push(selectedTime);
                                                        section.slots.sort();
                                                    }
                                                }
                                                return section.slots.length > 0 && (
                                                    <div key={section.key} className="border border-border-subtle rounded-2xl overflow-hidden">
                                                        {/* Header acordeón */}
                                                        <button
                                                            onClick={() => setOpenSections(prev => {
                                                                const next = new Set(prev);
                                                                next.has(section.key) ? next.delete(section.key) : next.add(section.key);
                                                                return next;
                                                            })}
                                                            className="w-full flex items-center justify-between px-5 py-3.5 bg-bg-card hover:bg-bg-elevated transition-colors"
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-1.5 h-1.5 rounded-full bg-gold" />
                                                                <span className="text-xs font-bold text-text-primary uppercase tracking-widest">{section.label}</span>
                                                                <span className="text-[10px] text-text-muted font-medium">{section.range}</span>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[10px] text-gold font-bold">{section.slots.length} cupos</span>
                                                                <ChevronRight className={`w-3.5 h-3.5 text-text-muted transition-transform duration-200 ${openSections.has(section.key) ? 'rotate-90' : ''
                                                                    }`} />
                                                            </div>
                                                        </button>
                                                        {/* Slots grid */}
                                                        {openSections.has(section.key) && (
                                                            <div className="px-4 pb-4 pt-3 grid grid-cols-3 gap-2 bg-bg-base">
                                                                {section.slots.map(time => (
                                                                    <button
                                                                        key={time}
                                                                        disabled={lockingTime !== null}
                                                                        onClick={async () => {
                                                                            if (lockingTime) return;

                                                                            // Si el usuario hace clic en la hora que ya tenía seleccionada, la deseleccionamos
                                                                            if (selectedTime === time) {
                                                                                const previousBloqueoId = bloqueoId;
                                                                                setBloqueoId(null);
                                                                                setSelectedTime(null);
                                                                                setLockExpiresAt(null);
                                                                                sessionStorage.removeItem('lola_lock_id');
                                                                                if (lockTimeoutId) {
                                                                                    clearTimeout(lockTimeoutId);
                                                                                    setLockTimeoutId(null);
                                                                                }
                                                                                if (previousBloqueoId) {
                                                                                    fetch(`/api/bloqueo-temporal?id=${previousBloqueoId}`, { method: 'DELETE' })
                                                                                        .then(() => {
                                                                                            // Forzar actualización inmediata visual y de BD
                                                                                            if (selectedDate) {
                                                                                                handleSelectDate(selectedDate.getDate(), true);
                                                                                            }
                                                                                        })
                                                                                        .catch(() => { });
                                                                                }
                                                                                return;
                                                                            }

                                                                            setLockingTime(time);

                                                                            // Primero limpiamos bloqueo local de la UI
                                                                            const previousBloqueoId = bloqueoId;
                                                                            setBloqueoId(null);
                                                                            setLockExpiresAt(null);
                                                                            sessionStorage.removeItem('lola_lock_id');
                                                                            if (lockTimeoutId) {
                                                                                clearTimeout(lockTimeoutId);
                                                                                setLockTimeoutId(null);
                                                                            }

                                                                            // Si había uno previo en backend, lo disparamos sin esperar (fire and forget)
                                                                            if (previousBloqueoId) {
                                                                                fetch(`/api/bloqueo-temporal?id=${previousBloqueoId}`, { method: 'DELETE' }).catch(() => { });
                                                                            }

                                                                            if (selectedDate) {
                                                                                const dateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
                                                                                try {
                                                                                    const res = await fetch('/api/bloqueo-temporal', {
                                                                                        method: 'POST',
                                                                                        headers: { 'Content-Type': 'application/json' },
                                                                                        body: JSON.stringify({
                                                                                            fecha: dateStr,
                                                                                            hora: time,
                                                                                            ...(buildPersonasPayload()
                                                                                                ? { personas: buildPersonasPayload() }
                                                                                                : {
                                                                                                    servicios: selectedServices.map(s => {
                                                                                                        const sIsStaff = s.nombre.toLowerCase().includes('staff') || s.responsable?.toLowerCase() === 'staff';
                                                                                                        const sIsMile = s.nombre.toLowerCase().includes('mile') || s.responsable?.toLowerCase() === 'mile';
                                                                                                        let pId = 'c2c0f778-c2fe-4f65-ab37-3b589cb997c2';
                                                                                                        if (sIsStaff && !sIsMile) pId = 'cc7bdd66-d98e-4c66-ae1d-b975e005bf56';
                                                                                                        return { uid: s.uid, profesionalId: pId, duracionMin: s.duracionMin + s.bufferMin, servicioId: s.id, precioTotal: s.precio };
                                                                                                    })
                                                                                                }),
                                                                                        }),
                                                                                    });
                                                                                    const data = await res.json();
                                                                                    if (res.status === 409) {
                                                                                        setShowConflictModal(true);
                                                                                        await handleSelectDate(selectedDate.getDate(), true);
                                                                                        setSelectedTime(null);
                                                                                        setLockingTime(null);
                                                                                        return;
                                                                                    }
                                                                                    if (data.bloqueoId) {
                                                                                        setBloqueoId(data.bloqueoId);
                                                                                        if (data.citas) setLockedCitas(data.citas);
                                                                                        sessionStorage.setItem('lola_lock_id', data.bloqueoId);
                                                                                        setSelectedTime(time);

                                                                                        // Set timeout para limpiar el estado si el backend expira el bloqueo
                                                                                        const expSecs = data.expiresInSeconds || 600;
                                                                                        setLockExpiresAt(Date.now() + expSecs * 1000);
                                                                                        const timeoutId = setTimeout(() => {
                                                                                            setShowExpiredModal(true);
                                                                                            setSelectedTime(null);
                                                                                            setBloqueoId(null);
                                                                                            setLockExpiresAt(null);
                                                                                            sessionStorage.removeItem('lola_lock_id');
                                                                                            setStep(prev => prev > 2 ? 2 : prev);
                                                                                        }, expSecs * 1000);
                                                                                        setLockTimeoutId(timeoutId);
                                                                                    }
                                                                                } catch (e) {
                                                                                    console.warn('No se pudo crear bloqueo temporal:', e);
                                                                                    setSelectedTime(null);
                                                                                } finally {
                                                                                    setLockingTime(null);
                                                                                }
                                                                            }
                                                                        }}
                                                                        className={`py-2 rounded-lg text-xs font-semibold tracking-wide transition-all ${selectedTime === time
                                                                            ? 'bg-gold text-black shadow-[0_0_10px_rgba(212,175,55,0.4)]'
                                                                            : 'bg-bg-surface border border-border-subtle text-text-primary hover:border-gold/50 hover:text-gold disabled:opacity-50 disabled:cursor-not-allowed'
                                                                            }`}
                                                                    >
                                                                        {lockingTime === time ? (
                                                                            <span className="flex items-center justify-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> {formatearHora(time)}</span>
                                                                        ) : (
                                                                            formatearHora(time)
                                                                        )}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex justify-between mt-12">
                                <button onClick={prevStep} className="flex items-center gap-2 px-6 py-4 text-text-secondary hover:text-text-primary font-bold transition-all uppercase tracking-wider text-sm">
                                    <ArrowLeft className="w-5 h-5" /> Volver
                                </button>
                                <button
                                    onClick={nextStep}
                                    disabled={!selectedTime}
                                    className="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-gold-dark via-gold to-gold-light text-black font-bold rounded-full disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-[0_0_20px_rgba(212,175,55,0.4)] transition-all uppercase tracking-wider text-sm"
                                >
                                    Continuar <ArrowRight className="w-5 h-5" />
                                </button>
                            </div>

                            {/* MODAL VIP FEE */}
                            {pendingVipDay && (
                                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
                                    <div className="bg-bg-card border border-gold/30 rounded-3xl w-full max-w-sm overflow-hidden p-8 text-center shadow-[0_0_50px_rgba(212,175,55,0.15)] relative">
                                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-gold-dark via-gold to-gold-light"></div>
                                        <div className="w-20 h-20 bg-gold/10 rounded-full mx-auto flex items-center justify-center mb-6 border border-gold/30 shadow-[0_0_20px_rgba(212,175,55,0.2)]">
                                            <Crown className="w-10 h-10 text-gold" />
                                        </div>
                                        <h3 className="text-2xl font-bold text-text-primary mb-3">Exclusividad VIP</h3>
                                        <p className="text-text-secondary text-sm mb-6 leading-relaxed">
                                            Los <span className="text-text-primary font-bold">Martes, Jueves y Sábados</span> son exclusivos de nuestro Staff. <br /><br />
                                            Agendar con <span className="text-gold font-bold">Mile</span> en estos días requiere un <span className="font-bold text-text-primary">Pase VIP</span> de <span className="text-gold font-bold text-lg">{formatCurrency(potentialVipFee)}</span>.
                                        </p>
                                        <div className="flex flex-col gap-3">
                                            {canSwapToStaff && (
                                                <button onClick={handleCambiarAStaff} className="w-full py-3.5 bg-bg-elevated border border-gold/30 text-gold rounded-xl font-bold hover:bg-gold/10 transition-colors flex flex-col items-center justify-center leading-tight">
                                                    <span>Cambiar al Staff (Evita el recargo)</span>
                                                    {staffSavings > 0 && <span className="text-[10px] uppercase tracking-wider text-text-muted mt-0.5">Y ahórrate {formatCurrency(staffSavings)} en el servicio</span>}
                                                </button>
                                            )}
                                            <div className="flex gap-3">
                                                <button onClick={() => setPendingVipDay(null)} className="flex-1 py-3.5 bg-bg-surface border border-border-subtle rounded-xl text-text-primary font-bold hover:bg-bg-elevated transition-colors text-sm">Cancelar</button>
                                                <button onClick={() => { setVipFeeAccepted(true); handleSelectDate(pendingVipDay, true); setPendingVipDay(null); }} className="flex-[1.5] py-3.5 bg-gold text-black rounded-xl font-bold shadow-[0_0_15px_rgba(212,175,55,0.4)] hover:shadow-[0_0_25px_rgba(212,175,55,0.6)] transition-all text-sm">Pagar +{formatCurrency(potentialVipFee)} (Mile)</button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* STEP 3: DATOS DEL CLIENTE */}
                    {step === 3 && (
                        <div className="space-y-8">
                            <div className="text-center mb-8">
                                <h1 className="text-3xl font-bold text-text-primary mb-2">Tus Datos</h1>
                                <p className="text-text-secondary">Necesitamos tu información para confirmar la reserva.</p>
                            </div>

                            <div className="bg-bg-card p-8 rounded-3xl border border-border-subtle shadow-2xl max-w-2xl mx-auto space-y-6">

                                <div>
                                    <label className="block text-xs uppercase tracking-wider font-bold text-text-secondary mb-2 flex items-center gap-2"><User className="w-4 h-4 text-gold" /> Nombre Completo <span className="text-rose-400">*</span></label>
                                    <input
                                        type="text"
                                        required
                                        className={`w-full bg-bg-base border rounded-xl px-4 py-3 text-text-primary focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-all ${!clientData.nombre.trim() ? 'border-rose-500/50' : 'border-border-subtle'}`}
                                        placeholder="Ej. Natalia Pérez"
                                        value={clientData.nombre}
                                        onChange={e => setClientData({ ...clientData, nombre: e.target.value })}
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-xs uppercase tracking-wider font-bold text-text-secondary mb-2 flex items-center gap-2"><Phone className="w-4 h-4 text-gold" /> Teléfono (WhatsApp) <span className="text-rose-400">*</span></label>
                                        <div className="flex gap-2">
                                            <select
                                                value={codigoPais}
                                                onChange={e => setCodigoPais(e.target.value)}
                                                className="bg-bg-base border border-border-subtle rounded-xl px-2 py-3 text-text-primary focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-all text-sm w-[100px] appearance-none cursor-pointer"
                                            >
                                                <option value="+57">🇨🇴 +57</option>
                                                <option value="+1">🇺🇸 +1</option>
                                                <option value="+52">🇲🇽 +52</option>
                                                <option value="+54">🇦🇷 +54</option>
                                                <option value="+55">🇧🇷 +55</option>
                                                <option value="+56">🇨🇱 +56</option>
                                                <option value="+51">🇵🇪 +51</option>
                                                <option value="+58">🇻🇪 +58</option>
                                                <option value="+593">🇪🇨 +593</option>
                                                <option value="+507">🇵🇦 +507</option>
                                                <option value="+34">🇪🇸 +34</option>
                                            </select>
                                            <div className="flex-1 flex flex-col">
                                                <input
                                                    type="tel"
                                                    required
                                                    className={`w-full bg-bg-base border rounded-xl px-4 py-3 text-text-primary focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-all ${clientData.telefono.trim() !== '' && !isPhoneValid ? 'border-rose-500/50' : 'border-border-subtle'}`}
                                                    placeholder="300 000 0000"
                                                    value={clientData.telefono}
                                                    onChange={e => setClientData({ ...clientData, telefono: e.target.value.replace(/\D/g, '') })}
                                                />
                                                {clientData.telefono.trim() !== '' && !isPhoneValid && (
                                                    <span className="text-[10px] text-rose-400 mt-1">{codigoPais === '+57' ? 'Debe tener exactamente 10 dígitos' : 'Número inválido'}</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs uppercase tracking-wider font-bold text-text-secondary mb-2 flex items-center gap-2"><Mail className="w-4 h-4 text-gold" /> Correo Electrónico <span className="text-text-muted text-[9px] ml-1">(opcional)</span></label>
                                        <input
                                            type="email"
                                            className={`w-full bg-bg-base border rounded-xl px-4 py-3 text-text-primary focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-all ${!isEmailValid ? 'border-rose-500/50' : 'border-border-subtle'}`}
                                            placeholder="correo@ejemplo.com"
                                            value={clientData.email}
                                            onChange={e => setClientData({ ...clientData, email: e.target.value })}
                                        />
                                        {!isEmailValid && <span className="text-[10px] text-rose-400 mt-1 block">El formato de correo no es válido</span>}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-xs uppercase tracking-wider font-bold text-text-secondary mb-2 flex items-center gap-2"><FileText className="w-4 h-4 text-gold" /> Cédula / Identificación <span className="text-rose-400">*</span></label>
                                        <input
                                            type="text"
                                            required
                                            className={`w-full bg-bg-base border rounded-xl px-4 py-3 text-text-primary focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-all ${clientData.cedula.trim() !== '' && !isCedulaValid ? 'border-rose-500/50' : 'border-border-subtle'}`}
                                            placeholder="1234567890"
                                            value={clientData.cedula}
                                            onChange={e => setClientData({ ...clientData, cedula: e.target.value.replace(/\D/g, '') })}
                                        />
                                        {clientData.cedula.trim() !== '' && !isCedulaValid && <span className="text-[10px] text-rose-400 mt-1 block">Mínimo 5 dígitos numéricos</span>}
                                    </div>
                                    <div>
                                        <label className="block text-xs uppercase tracking-wider font-bold text-text-secondary mb-2 flex items-center gap-2"><Calendar className="w-4 h-4 text-gold" /> Fecha de Nacimiento <span className="text-rose-400">*</span></label>
                                        <input
                                            type="date"
                                            required
                                            className={`w-full bg-bg-base border rounded-xl px-4 py-3 text-text-primary focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-all ${!clientData.cumpleanos ? 'border-rose-500/50' : 'border-border-subtle'}`}
                                            value={clientData.cumpleanos}
                                            onChange={e => setClientData({ ...clientData, cumpleanos: e.target.value })}
                                        />
                                    </div>
                                </div>

                                {/* DATOS DE LA AMIGA */}
                                {esReservaCompartida && (
                                    <div className="border-t border-gold/20 pt-6 mt-2">
                                        <h3 className="text-sm font-bold text-gold uppercase tracking-widest mb-4 flex items-center gap-2">
                                            <Users className="w-4 h-4" /> Datos de tu amiga
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <label className="block text-xs uppercase tracking-wider font-bold text-text-secondary mb-2 flex items-center gap-2"><User className="w-4 h-4 text-gold" /> Nombre <span className="text-rose-400">*</span></label>
                                                <input
                                                    type="text"
                                                    required
                                                    className={`w-full bg-bg-base border rounded-xl px-4 py-3 text-text-primary focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-all ${!datosAmiga.nombre.trim() ? 'border-rose-500/50' : 'border-border-subtle'}`}
                                                    placeholder="Nombre de tu amiga"
                                                    value={datosAmiga.nombre}
                                                    onChange={e => setDatosAmiga({ ...datosAmiga, nombre: e.target.value })}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs uppercase tracking-wider font-bold text-text-secondary mb-2 flex items-center gap-2"><Phone className="w-4 h-4 text-gold" /> Teléfono (WhatsApp) <span className="text-rose-400">*</span></label>
                                                <div className="flex gap-2">
                                                    <select
                                                        value={codigoPaisAmiga}
                                                        onChange={e => setCodigoPaisAmiga(e.target.value)}
                                                        className="bg-bg-base border border-border-subtle rounded-xl px-2 py-3 text-text-primary focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-all text-sm w-[100px] appearance-none cursor-pointer"
                                                    >
                                                        <option value="+57">🇨🇴 +57</option>
                                                        <option value="+1">🇺🇸 +1</option>
                                                        <option value="+58">🇻🇪 +58</option>
                                                    </select>
                                                    <div className="flex-1 flex flex-col">
                                                        <input
                                                            type="tel"
                                                            required
                                                            className={`w-full bg-bg-base border rounded-xl px-4 py-3 text-text-primary focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-all ${datosAmiga.telefono.trim() !== '' && !isPhoneAmigaValid ? 'border-rose-500/50' : 'border-border-subtle'}`}
                                                            placeholder="300 000 0000"
                                                            value={datosAmiga.telefono}
                                                            onChange={e => setDatosAmiga({ ...datosAmiga, telefono: e.target.value.replace(/\D/g, '') })}
                                                        />
                                                        {datosAmiga.telefono.trim() !== '' && !isPhoneAmigaValid && (
                                                            <span className="text-[10px] text-rose-400 mt-1">{codigoPaisAmiga === '+57' ? 'Debe tener exactamente 10 dígitos' : 'Número inválido'}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-between mt-12 max-w-2xl mx-auto">
                                <button onClick={prevStep} className="flex items-center gap-2 px-6 py-4 text-text-secondary hover:text-text-primary font-bold transition-all uppercase tracking-wider text-sm">
                                    <ArrowLeft className="w-5 h-5" /> Volver
                                </button>
                                <button
                                    onClick={nextStep}
                                    disabled={!isStep3Valid}
                                    className="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-gold-dark via-gold to-gold-light text-black font-bold rounded-full disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-[0_0_20px_rgba(212,175,55,0.4)] transition-all uppercase tracking-wider text-sm"
                                >
                                    Ver Resumen <ArrowRight className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* STEP 4: CONFIRMACIÓN */}
                    {step === 4 && (
                        isConfirmed ? (
                            <div className="max-w-md mx-auto mt-12 bg-bg-card border border-gold/30 rounded-3xl p-8 text-center shadow-[0_0_50px_rgba(212,175,55,0.15)] relative overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-700">
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-gold to-transparent"></div>
                                <div className="w-20 h-20 bg-gold/10 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <CheckCircle2 className="w-10 h-10 text-gold" />
                                </div>
                                <h2 className="text-2xl font-bold text-text-primary mb-2">¡Cita Pre-agendada!</h2>
                                <p className="text-text-secondary text-sm mb-6 leading-relaxed">
                                    Tu cita ya está pre-agendada. Para que sea confirmada y <strong className="text-rose-400">no se libere dentro de una hora</strong>, envía tu comprobante lo más pronto posible a Lola.
                                    <strong className="text-text-primary block mt-2">Usa el botón para generar los detalles de la cita y Lola te indicará los siguientes pasos.</strong>
                                </p>
                                
                                <button
                                    onClick={() => window.open(confirmedWppUrl, '_blank')}
                                    className="w-full py-4 bg-[#25D366] text-white font-bold text-sm uppercase tracking-wider rounded-xl shadow-[0_0_20px_rgba(37,211,102,0.4)] hover:shadow-[0_0_30px_rgba(37,211,102,0.6)] transition-all hover:-translate-y-1 flex items-center justify-center gap-2 mb-4"
                                >
                                    Enviar WhatsApp a Lola <ArrowRight className="w-5 h-5" />
                                </button>

                                <Link href="/mis-citas" className="w-full py-3 bg-bg-surface border border-gold/30 text-gold font-bold text-sm uppercase tracking-wider rounded-xl hover:bg-gold/10 transition-all flex items-center justify-center gap-2">
                                    <Calendar className="w-4 h-4" /> Ir a Mis Citas
                                </Link>

                                <p className="text-[10px] text-text-muted mt-6">
                                    <Info className="w-3.5 h-3.5 inline mr-1" />
                                    Asegúrate de enviar el mensaje que se generará automáticamente.
                                </p>
                            </div>
                        ) : (
                        <div className="space-y-8">
                            <div className="text-center mb-8">
                                <h1 className="text-3xl font-bold text-text-primary mb-2">Finaliza tu Reserva</h1>
                                <p className="text-text-secondary">Verifica los detalles y selecciona tu método de pago para confirmar.</p>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl mx-auto items-start">

                                {/* COLUMNA IZQUIERDA */}
                                <div className="flex flex-col gap-6">

                                    {/* TICKET DE RESUMEN */}
                                    <div className="bg-bg-card border border-border-subtle rounded-3xl p-6 shadow-2xl relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-gold/10 to-transparent rounded-bl-full pointer-events-none"></div>

                                        <h3 className="text-lg font-bold text-gold uppercase tracking-widest mb-6 flex items-center gap-2 relative z-10">
                                            <FileText className="w-5 h-5" /> Resumen de Reserva
                                        </h3>

                                        {(() => {
                                            let titularHora = selectedTime ? formatearHora(selectedTime) : '';
                                            let amigaHora = titularHora;
                                            
                                            if (esReservaCompartida && serviciosAmiga.length > 0 && serviciosTitular.length > 0 && lockedCitas.length > 0) {
                                                const citasTitular = lockedCitas.filter(lc => serviciosTitular.some(s => s.uid === lc.uid));
                                                const citasAmiga = lockedCitas.filter(lc => serviciosAmiga.some(s => s.uid === lc.uid));
                                                
                                                if (citasTitular.length > 0) {
                                                    citasTitular.sort((a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime());
                                                    const d = new Date(citasTitular[0].inicio);
                                                    titularHora = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'America/Bogota' });
                                                }
                                                if (citasAmiga.length > 0) {
                                                    citasAmiga.sort((a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime());
                                                    const d = new Date(citasAmiga[0].inicio);
                                                    amigaHora = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'America/Bogota' });
                                                }
                                            }

                                            return (
                                        <div className="space-y-4 relative z-10">
                                            <div className="bg-bg-surface rounded-2xl p-4 border border-border-subtle">
                                                {esReservaCompartida ? (
                                                    <>
                                                        <div className="flex justify-between items-center mb-3 border-b border-gold/20 pb-2">
                                                            <p className="text-xs text-gold uppercase tracking-wider font-bold flex items-center gap-2"><User className="w-3.5 h-3.5" /> Tus servicios ({serviciosTitular.length})</p>
                                                            <p className="text-xs text-text-muted font-semibold bg-bg-base px-2 py-1 rounded-md flex items-center gap-1"><Clock className="w-3 h-3 text-gold" /> {titularHora}</p>
                                                        </div>
                                                        <div className="space-y-3 mb-4">
                                                            {serviciosTitular.map(srv => {
                                                                const horaSrv = obtenerHoraServicio(srv);
                                                                return (
                                                                    <div key={srv.uid} className="flex justify-between items-start">
                                                                        <div>
                                                                            <p className="font-bold text-text-primary text-sm">{srv.nombre}</p>
                                                                            <div className="flex items-center gap-2 text-xs text-text-secondary mt-0.5">
                                                                                <span>{formatearDuracion(srv.duracionMin)}</span>
                                                                                {horaSrv && (
                                                                                    <>
                                                                                        <span className="text-text-muted">•</span>
                                                                                        <span className="text-gold font-medium flex items-center gap-1">
                                                                                            <Clock className="w-3 h-3 text-gold/80" /> {horaSrv}
                                                                                        </span>
                                                                                    </>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                        <p className="font-semibold text-text-primary text-sm">{formatCurrency(srv.precio)}</p>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                        <div className="flex justify-between items-center mb-3 border-b border-gold/20 pb-2">
                                                            <p className="text-xs text-gold uppercase tracking-wider font-bold flex items-center gap-2"><Users className="w-3.5 h-3.5" /> Servicios de {datosAmiga.nombre || 'tu amiga'} ({serviciosAmiga.length})</p>
                                                            <p className="text-xs text-text-muted font-semibold bg-bg-base px-2 py-1 rounded-md flex items-center gap-1"><Clock className="w-3 h-3 text-gold" /> {amigaHora}</p>
                                                        </div>
                                                        <div className="space-y-3">
                                                            {serviciosAmiga.map(srv => {
                                                                const horaSrv = obtenerHoraServicio(srv);
                                                                return (
                                                                    <div key={`amiga-${srv.uid}`} className="flex justify-between items-start">
                                                                        <div>
                                                                            <p className="font-bold text-text-primary text-sm">{srv.nombre}</p>
                                                                            <div className="flex items-center gap-2 text-xs text-text-secondary mt-0.5">
                                                                                <span>{formatearDuracion(srv.duracionMin)}</span>
                                                                                {horaSrv && (
                                                                                    <>
                                                                                        <span className="text-text-muted">•</span>
                                                                                        <span className="text-gold font-medium flex items-center gap-1">
                                                                                            <Clock className="w-3 h-3 text-gold/80" /> {horaSrv}
                                                                                        </span>
                                                                                    </>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                        <p className="font-semibold text-text-primary text-sm">{formatCurrency(srv.precio)}</p>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </>
                                                ) : (
                                                    <>
                                                        <p className="text-xs text-text-muted uppercase tracking-wider font-semibold mb-3 border-b border-border-subtle pb-2">Servicios ({selectedServices.length})</p>
                                                        <div className="space-y-3">
                                                            {selectedServices.map(srv => {
                                                                const horaSrv = obtenerHoraServicio(srv);
                                                                return (
                                                                    <div key={srv.uid} className="flex justify-between items-start">
                                                                        <div>
                                                                            <p className="font-bold text-text-primary text-sm">{srv.nombre}</p>
                                                                            <div className="flex items-center gap-2 text-xs text-text-secondary mt-0.5">
                                                                                <span>{formatearDuracion(srv.duracionMin)}</span>
                                                                                {horaSrv && (
                                                                                    <>
                                                                                        <span className="text-text-muted">•</span>
                                                                                        <span className="text-gold font-medium flex items-center gap-1">
                                                                                            <Clock className="w-3 h-3 text-gold/80" /> {horaSrv}
                                                                                        </span>
                                                                                    </>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                        <p className="font-semibold text-text-primary text-sm">{formatCurrency(srv.precio)}</p>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </>
                                                )}
                                                <div className="border-t border-border-subtle mt-4 pt-3 flex justify-between items-center">
                                                    <p className="font-bold text-text-secondary text-xs uppercase tracking-wider">Costo Total</p>
                                                    <p className="font-bold text-text-primary">{formatCurrency(totalPrecio)}</p>
                                                </div>
                                            </div>

                                            <div className="bg-bg-surface rounded-2xl p-4 border border-border-subtle space-y-3">
                                                <div className="flex items-center gap-3">
                                                    <Calendar className="w-4 h-4 text-gold" />
                                                    <div>
                                                        <p className="text-xs text-text-muted uppercase tracking-wider font-semibold">Día</p>
                                                        <p className="font-medium text-text-primary capitalize text-sm">{selectedDate?.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <Clock className="w-4 h-4 text-gold" />
                                                    <div>
                                                        <p className="text-xs text-text-muted uppercase tracking-wider font-semibold">Hora</p>
                                                        <p className="font-medium text-text-primary text-sm">{formatearHora(selectedTime)}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <User className="w-4 h-4 text-gold" />
                                                    <div>
                                                        <p className="text-xs text-text-muted uppercase tracking-wider font-semibold">Cliente</p>
                                                        <p className="font-medium text-text-primary text-sm">{clientData.nombre}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        );
                                        })()}
                                    </div>

                                    {/* ABONO REQUERIDO */}
                                    <div className="w-full bg-gold/10 border border-gold/30 rounded-3xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left shadow-lg">
                                        <div>
                                            <p className="text-xs text-text-secondary font-bold uppercase tracking-wider">Abono requerido hoy</p>
                                            <p className="text-[10px] text-gold/80 mt-1 uppercase tracking-widest font-semibold">Asegura tus espacios</p>
                                        </div>
                                        <div className="flex flex-col items-end">
                                            {cuponActivo && (
                                                <p className="text-sm font-semibold text-text-muted line-through mb-0.5">{formatCurrency(totalAbonoSinDescuento)}</p>
                                            )}
                                            <p className="text-3xl font-bold text-gold drop-shadow-[0_0_10px_rgba(212,175,55,0.3)]">{formatCurrency(totalAbono)}</p>
                                        </div>
                                    </div>

                                </div>

                                {/* COLUMNA DERECHA: MÉTODO DE PAGO Y CONFIRMACIÓN */}
                                <div className="flex flex-col gap-6">

                                    {/* SECCIÓN CUPÓN */}
                                    <div className="bg-bg-card border border-border-subtle rounded-3xl p-6 shadow-xl">
                                        <p className="text-xs text-text-muted uppercase tracking-wider font-bold mb-4 flex items-center gap-2">
                                            <Ticket className="w-4 h-4 text-gold" />
                                            ¿Tienes un cupón?
                                        </p>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={codigoCupon}
                                                onChange={(e) => setCodigoCupon(e.target.value.toUpperCase())}
                                                placeholder="Ingresa tu código"
                                                className="flex-1 bg-bg-surface border border-border-subtle rounded-xl px-4 py-3 text-sm focus:border-gold outline-none uppercase font-semibold tracking-wider text-text-primary"
                                                disabled={validandoCupon || cuponActivo !== null}
                                            />
                                            {cuponActivo ? (
                                                <button
                                                    onClick={removerCupon}
                                                    className="px-4 py-3 bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded-xl font-bold text-sm hover:bg-rose-500/20 transition-all"
                                                >
                                                    Quitar
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={validarCupon}
                                                    disabled={!codigoCupon.trim() || validandoCupon}
                                                    className="px-6 py-3 bg-gold/10 text-gold border border-gold/30 rounded-xl font-bold text-sm hover:bg-gold/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                                >
                                                    {validandoCupon ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Aplicar'}
                                                </button>
                                            )}
                                        </div>
                                        {cuponError && (
                                            <p className="text-rose-400 text-xs mt-2 flex items-center gap-1">
                                                <AlertCircle className="w-3.5 h-3.5" /> {cuponError}
                                            </p>
                                        )}
                                        {cuponActivo && (
                                            <p className="text-green-400 text-xs mt-2 flex items-center gap-1">
                                                <CheckCircle2 className="w-3.5 h-3.5" /> {cuponActivo.mensaje}
                                            </p>
                                        )}
                                    </div>

                                    {/* SELECCIÓN DE MÉTODO */}
                                    <div className="bg-bg-card border border-border-subtle rounded-3xl p-6 shadow-xl">
                                        <p className="text-xs text-text-muted uppercase tracking-wider font-bold mb-4">¿Cómo deseas hacer tu abono?</p>
                                        <div className="grid grid-cols-2 gap-3 mb-6">
                                            <button
                                                onClick={() => setMetodoPago('nequi')}
                                                className={`py-3 px-4 rounded-xl border text-sm font-bold flex items-center justify-center gap-2 transition-all ${metodoPago === 'nequi'
                                                    ? 'bg-[#E3007E]/10 border-[#E3007E] text-[#E3007E] shadow-[0_0_15px_rgba(227,0,126,0.2)] scale-[1.02]'
                                                    : 'bg-bg-base border-border-subtle text-text-secondary hover:border-[#E3007E]/50'
                                                    }`}
                                            >
                                                <SmartphoneNfc className="w-5 h-5" /> Nequi
                                            </button>
                                            <button
                                                onClick={() => setMetodoPago('daviplata')}
                                                className={`py-3 px-4 rounded-xl border text-sm font-bold flex items-center justify-center gap-2 transition-all ${metodoPago === 'daviplata'
                                                    ? 'bg-[#ED1C24]/10 border-[#ED1C24] text-[#ED1C24] shadow-[0_0_15px_rgba(237,28,36,0.2)] scale-[1.02]'
                                                    : 'bg-bg-base border-border-subtle text-text-secondary hover:border-[#ED1C24]/50'
                                                    }`}
                                            >
                                                <Wallet className="w-5 h-5" /> Daviplata
                                            </button>

                                            {(!configData || configData.acepta_tarjeta !== false) && (
                                                <button
                                                    onClick={() => setMetodoPago('tarjeta')}
                                                    className={`py-3 px-4 rounded-xl border text-sm font-bold flex items-center justify-center gap-2 transition-all ${metodoPago === 'tarjeta'
                                                        ? 'bg-gold/10 border-gold text-gold shadow-[0_0_15px_rgba(212,175,55,0.2)] scale-[1.02]'
                                                        : 'bg-bg-base border-border-subtle text-text-secondary hover:border-gold/50'
                                                        }`}
                                                >
                                                    <CreditCard className="w-5 h-5" /> Tarjeta
                                                </button>
                                            )}

                                            {(!configData || configData.acepta_sistecredito !== false) && totalPrecio > 200000 && (
                                                <button
                                                    onClick={() => setMetodoPago('sistecredito')}
                                                    className={`py-3 px-4 rounded-xl border text-sm font-bold flex items-center justify-center gap-2 transition-all ${metodoPago === 'sistecredito'
                                                        ? 'bg-[#00A650]/10 border-[#00A650] text-[#00A650] shadow-[0_0_15px_rgba(0,166,80,0.2)] scale-[1.02]'
                                                        : 'bg-bg-base border-border-subtle text-text-secondary hover:border-[#00A650]/50'
                                                        }`}
                                                >
                                                    <Landmark className="w-5 h-5" /> SisteCrédito
                                                </button>
                                            )}
                                        </div>

                                        {/* INSTRUCCIONES DEL MÉTODO SELECCIONADO */}
                                        <div className="bg-bg-base rounded-2xl p-4 border border-border-subtle mb-6 text-sm">
                                            {(metodoPago === 'nequi' || metodoPago === 'daviplata') ? (
                                                <div className="flex flex-col gap-4">
                                                    <p className="text-text-secondary">Transfiere exactamente <strong className="text-text-primary">{formatCurrency(totalAbono)}</strong> a:</p>

                                                    <div className="flex flex-col">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <CreditCard className="w-4 h-4 text-gold" />
                                                            <span className="text-xs text-text-muted uppercase tracking-widest font-bold">Métodos de Pago</span>
                                                        </div>

                                                        <div className="bg-[#1A1A1A] p-4 rounded-xl border border-gold/30 flex justify-between items-center group relative overflow-hidden shadow-inner">
                                                            <div className="flex flex-col relative z-10">
                                                                <span className="font-semibold text-text-secondary text-sm">
                                                                    {metodoPago === 'nequi' ? 'Nequi' : 'Daviplata'}
                                                                    <span className="text-xs font-normal text-text-muted ml-1 hidden sm:inline">({configData?.titular_cuenta || 'Milé Almanza'})</span>
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-3 relative z-10">
                                                                <span className="font-bold text-lg tracking-wider text-text-primary">
                                                                    {metodoPago === 'nequi' ? (configData?.nequi_numero || 'Consultando...') : (configData?.daviplata_numero || 'Consultando...')}
                                                                </span>
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.preventDefault();
                                                                        const num = metodoPago === 'nequi' ? configData?.nequi_numero : configData?.daviplata_numero;
                                                                        if (num && navigator.clipboard) {
                                                                            navigator.clipboard.writeText(num.replace(/\s/g, '')).catch(() => {});
                                                                        }

                                                                        // Visual feedback
                                                                        const btn = e.currentTarget;
                                                                        const originalHtml = btn.innerHTML;
                                                                        btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-check text-green-500"><path d="M20 6 9 17l-5-5"/></svg>';
                                                                        setTimeout(() => btn.innerHTML = originalHtml, 2000);
                                                                    }}
                                                                    className="p-1.5 rounded-md bg-bg-surface border border-border-subtle hover:border-gold/50 text-text-muted hover:text-gold transition-colors shadow-sm"
                                                                    title="Copiar número"
                                                                >
                                                                    <Copy className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <p className="text-xs text-text-muted"><Info className="w-3.5 h-3.5 inline mr-1" />Al confirmar, te redirigiremos a WhatsApp para enviar tu comprobante.</p>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col gap-2 text-center py-2">
                                                    <Activity className="w-8 h-8 text-gold mx-auto mb-2 opacity-80" />
                                                    <p className="text-text-secondary">Has seleccionado pagar con <strong className="text-text-primary capitalize">{metodoPago}</strong>.</p>
                                                    {metodoPago === 'sistecredito' && (
                                                        <p className="text-xs text-text-muted"><Info className="w-3.5 h-3.5 inline mr-1" />Al confirmar, te redirigiremos a WhatsApp. Necesitaremos tu cédula para validar tu cupo disponible y generarte un link de pago.</p>
                                                    )}
                                                    {metodoPago === 'tarjeta' && (
                                                        <p className="text-xs text-text-muted"><Info className="w-3.5 h-3.5 inline mr-1" />El pago con tarjeta se realiza de manera presencial en el local. Tu cita requerirá aprobación manual por parte de Milena tras enviar el WhatsApp.</p>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        <button
                                            disabled={!bloqueoId}
                                            onClick={async (e) => {
                                                const btn = e.currentTarget;
                                                btn.disabled = true;
                                                btn.innerHTML = '<span class="flex items-center justify-center gap-2"><svg class="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path></svg> Procesando...</span>';

                                                try {
                                                    const res = await fetch('/api/checkout', {
                                                        method: 'POST',
                                                        headers: { 'Content-Type': 'application/json' },
                                                        body: JSON.stringify({
                                                            bloqueoId,
                                                            cliente: { ...clientData, telefono: `${codigoPais}${clientData.telefono.replace(/\s/g, '')}` },
                                                            ...(esReservaCompartida && datosAmiga.nombre ? {
                                                                amiga: { nombre: datosAmiga.nombre, telefono: `${codigoPaisAmiga}${datosAmiga.telefono.replace(/\s/g, '')}` },
                                                                serviciosTitularIds: serviciosTitular.map(s => lockedCitas.find(lc => lc.uid === s.uid)?.id || s.id),
                                                                serviciosAmigaIds: serviciosAmiga.map(s => lockedCitas.find(lc => lc.uid === s.uid)?.id || s.id)
                                                            } : {
                                                                serviciosTitularIds: serviciosTitular.map(s => lockedCitas.find(lc => lc.uid === s.uid)?.id || s.id)
                                                            }),
                                                            metodoPago,
                                                            totalAbono,
                                                            cuponId: cuponActivo?.cuponId,
                                                            totalPrecio
                                                        })
                                                    });
                                                    const data = await res.json();
                                                    if (res.ok && data.success) {
                                                        try {
                                                            localStorage.setItem('lola_client_data', JSON.stringify(clientData));
                                                        } catch (e) { }
                                                        sessionStorage.removeItem('lola_lock_id');
                                                        if (lockTimeoutId) {
                                                            clearTimeout(lockTimeoutId);
                                                            setLockTimeoutId(null);
                                                        }
                                                        // Construir mensaje de WhatsApp
                                                        const fechaTexto = selectedDate ? selectedDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }) : '';

                                                        let textAdicional = `¡Quedo atenta para enviar el comprobante!`;
                                                        if (metodoPago === 'sistecredito') {
                                                            textAdicional = `Mi método de pago es SisteCrédito. Te envío mi cédula para que verifiquen mi cupo y me puedan generar el link de pago.`;
                                                        } else if (metodoPago === 'tarjeta') {
                                                            textAdicional = `Mi método de pago es Tarjeta. Entiendo que el pago es presencial en el local y quedo atenta a la confirmación de la cita.`;
                                                        }

                                                        let urlMsg: string;
                                                        if (esReservaCompartida && serviciosAmiga.length > 0) {
                                                            const srvTitularTexto = serviciosTitular.map(s => {
                                                                const horaSrv = obtenerHoraServicio(s);
                                                                return `%0A  - ${s.nombre}${horaSrv ? ` (${horaSrv})` : ''}`;
                                                            }).join('');
                                                            const srvAmigaTexto = serviciosAmiga.map(s => {
                                                                const horaSrv = obtenerHoraServicio(s);
                                                                return `%0A  - ${s.nombre}${horaSrv ? ` (${horaSrv})` : ''}`;
                                                            }).join('');
                                                            urlMsg = `Hola Lola! 👋%0A%0A🎀 *RESERVA COMPARTIDA*%0A%0A👤 *Titular:* ${clientData.nombre}%0A📝 *Cédula:* ${clientData.cedula}%0A💇‍♀️ *Servicios:*${srvTitularTexto}%0A%0A👤 *Amiga:* ${datosAmiga.nombre}%0A💇‍♀️ *Servicios:*${srvAmigaTexto}%0A%0A⏰ *Cuándo:* ${fechaTexto} (Inicia ${formatearHora(selectedTime)})%0A💳 *Método:* ${metodoPago.toUpperCase()}%0A💰 *Abono Total:* $${totalAbono.toLocaleString('es-CO')}%0A%0A${textAdicional}`;
                                                        } else {
                                                            const serviciosTexto = selectedServices.map(s => {
                                                                const horaSrv = obtenerHoraServicio(s);
                                                                return `%0A  - ${s.nombre}${horaSrv ? ` (${horaSrv})` : ''}`;
                                                            }).join('');
                                                            urlMsg = `Hola Lola! 👋%0A%0A*NUEVA RESERVA*%0A%0A👤 *Nombre:* ${clientData.nombre}%0A📝 *Cédula:* ${clientData.cedula}%0A💇‍♀️ *Servicios:*${serviciosTexto}%0A⏰ *Cuándo:* ${fechaTexto} (Inicia ${formatearHora(selectedTime)})%0A💳 *Método de Abono:* ${metodoPago.toUpperCase()}%0A💰 *Valor del Abono:* $${totalAbono.toLocaleString('es-CO')}%0A%0A${textAdicional}`;
                                                        }
                                                        const wppNumber = configData?.whatsapp_numero || '573043908714';
                                                        const finalUrl = `https://wa.me/${wppNumber}?text=${urlMsg}`;
                                                        
                                                        setConfirmedWppUrl(finalUrl);
                                                        setIsConfirmed(true);
                                                        setLockExpiresAt(null);
                                                        window.open(finalUrl, '_blank');
                                                        btn.innerHTML = '<span class="flex items-center justify-center gap-2"><svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg> ¡Pre-agendada!</span>';
                                                    } else {
                                                        setErrorModalMsg(data.error || 'Ocurrió un error. Tu tiempo de reserva pudo haber expirado.');
                                                        setShowErrorModal(true);
                                                        btn.disabled = false;
                                                        btn.innerHTML = '<span class="flex items-center justify-center gap-2">Pre-agendar Cita <ArrowRight class="w-5 h-5" /></span>';
                                                    }
                                                } catch (err) {
                                                    setErrorModalMsg('Error de conexión. Revisa tu internet e intenta de nuevo.');
                                                    setShowErrorModal(true);
                                                    btn.disabled = false;
                                                    btn.innerHTML = '<span class="flex items-center justify-center gap-2">Pre-agendar Cita <ArrowRight class="w-5 h-5" /></span>';
                                                }
                                            }}
                                            className="w-full py-4 bg-gradient-to-r from-gold-dark via-gold to-gold-light text-black font-bold text-sm uppercase tracking-wider rounded-xl shadow-[0_0_20px_rgba(212,175,55,0.4)] hover:shadow-[0_0_30px_rgba(212,175,55,0.6)] transition-all hover:-translate-y-1 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <span className="flex items-center justify-center gap-2">Pre-agendar Cita <ArrowRight className="w-5 h-5" /></span>
                                        </button>

                                        <button onClick={prevStep} className="w-full mt-4 py-3 text-xs font-semibold text-text-muted hover:text-text-primary transition-colors uppercase tracking-wider">
                                            Volver a modificar datos
                                        </button>
                                    </div>
                                </div>

                            </div>
                        </div>
                        )
                    )}

                </div>
            </main>
        </div>
    );
}
