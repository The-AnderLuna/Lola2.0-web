"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { CreditCard, ArrowRight, Clock, Star, MapPin, Phone, AtSign, Calendar, ChevronLeft, LayoutGrid, Users } from "lucide-react";
import { RepositorioServicios } from "@/adaptadores/repositorios/RepositorioServicios";
import { Servicio } from "@/nucleo/entidades/Servicio";

const CATEGORY_IMAGES: Record<string, string> = {
  cejas: "/images/micropigmentation.png",
  faciales: "/images/facial.png",
  pestañas: "/images/lashes.png",
  labios: "/images/lips.png",
  default: "/images/hero.png",
};

const CATEGORY_DETAILS: Record<string, { desc: string }> = {
  cejas: {
    desc: "El marco de tu mirada. Diseños de micropigmentación hiperrealista, sombreado híbrido, laminado y perfilado de alta definición."
  },
  facial: {
    desc: "Limpiezas faciales profundas VIP con hidrafacial, peelings químicos inteligentes y mascarillas hidroplásticas avanzadas."
  },
  faciales: {
    desc: "Limpiezas faciales profundas VIP con hidrafacial, peelings químicos inteligentes y mascarillas hidroplásticas avanzadas."
  },
  pestañas: {
    desc: "Efecto volumen y mirada expresiva de impacto. Extensiones clásicas, volumen tecnológico y volumen ruso de alta fidelidad."
  },
  labios: {
    desc: "Definición, color vibrante y volumen óptico las 24 horas. Micropigmentación de labios efecto acuarela o efecto labial."
  },
  cauterización: {
    desc: "Remoción precisa y aséptica de imperfecciones benignas de la piel con cicatrización limpia y regeneración celular avanzada."
  },
  corporal: {
    desc: "Tratamientos reductores, reafirmantes y drenajes linfáticos posoperatorios con aparatología de punta y masajes profesionales."
  },
  depilación: {
    desc: "Eliminación profesional y duradera de vello no deseado mediante cera premium e insumos hipoalergénicos."
  },
  despigmentación: {
    desc: "Atenuación progresiva y controlada de manchas faciales, ojeras y melasma mediante aplicación de activos despigmentantes."
  },
  láser: {
    desc: "Remoción láser ultrasegura de tatuajes y micropigmentaciones antiguas con tecnología Q-Switched y mínima agresión dérmica."
  },
  "medicina estética": {
    desc: "Tratamientos de rejuvenecimiento facial no quirúrgico y armonización guiados por especialistas en medicina estética certificada."
  },
  "promos día de la madre": {
    desc: "Paquetes VIP exclusivos creados para consentir a mamá con la mejor combinación de tratamientos faciales y diseño de cejas."
  },
  valoraciones: {
    desc: "Asesorías visuales completamente personalizadas, diagnóstico de piel del rostro y diseño preliminar para tratamientos futuros."
  },
  default: {
    desc: "Tratamientos de alta costura diseñados y supervisados por la especialista Milé Almanza para exaltar tu belleza natural."
  }
};

interface GrupoServicio {
  nombreBase: string;
  categoria: string;
  minPrecio: number;
  maxPrecio: number;
  minDuracion: number;
  minAbono: number;
  servicios: Servicio[];
}

export default function ServiciosPage() {
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("categorias");

  useEffect(() => {
    async function loadData() {
      try {
        const repo = new RepositorioServicios();
        const data = await repo.obtenerActivos();
        setServicios(data);
      } catch (err) {
        console.error("Error loading services:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Parse category selection from URL if present
  useEffect(() => {
    if (servicios.length > 0 && typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const catParam = params.get("categoria") || params.get("category");
      if (catParam) {
        setActiveTab(catParam.toLowerCase());
      }
    }
  }, [servicios]);

  // Preferred order of categories to match the reservar wizard
  const preferredOrder = [
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

  // Extract unique categories (lowercased) and sort them based on the preferred order
  const uniqueCategories = Array.from(new Set(servicios.map(s => s.categoria.toLowerCase()))).sort((a, b) => {
    const indexA = preferredOrder.indexOf(a);
    const indexB = preferredOrder.indexOf(b);

    if (indexA === -1 && indexB === -1) return a.localeCompare(b);
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });

  // Group and sort services for the active category
  const getAgrupadosByCategory = (catKey: string): GrupoServicio[] => {
    const servicesInCat = servicios.filter(s => s.categoria.toLowerCase() === catKey.toLowerCase());
    const gruposMap = new Map<string, Servicio[]>();
    
    servicesInCat.forEach(s => {
      // Normalize base name (e.g. "Higiene Facial Profunda (VIP) - Mile" -> "Higiene Facial Profunda (VIP)")
      const nombreBase = s.nombre.replace(/ - (Mile|Staff)$/i, '').trim();
      if (!gruposMap.has(nombreBase)) {
        gruposMap.set(nombreBase, []);
      }
      gruposMap.get(nombreBase)!.push(s);
    });

    const list: GrupoServicio[] = [];
    gruposMap.forEach((variantList, nombreBase) => {
      // Sort variations by price ascending
      variantList.sort((a, b) => a.precio - b.precio);
      const minPrecio = Math.min(...variantList.map(s => s.precio));
      const maxPrecio = Math.max(...variantList.map(s => s.precio));
      const minDuracion = Math.min(...variantList.map(s => s.duracionMin));
      const minAbono = Math.min(...variantList.map(s => s.abonoRequerido));

      list.push({
        nombreBase,
        categoria: variantList[0].categoria,
        minPrecio,
        maxPrecio,
        minDuracion,
        minAbono,
        servicios: variantList
      });
    });

    // Sort groups inside category by minPrecio ascending (de menor a mayor)
    list.sort((a, b) => a.minPrecio - b.minPrecio);

    return list;
  };

  const getCategoryImage = (cat: string) => {
    const key = cat.toLowerCase();
    if (key.includes("ceja")) return CATEGORY_IMAGES.cejas;
    if (key.includes("facial") || key.includes("estét")) return CATEGORY_IMAGES.faciales;
    if (key.includes("pesta")) return CATEGORY_IMAGES.pestañas;
    if (key.includes("labio")) return CATEGORY_IMAGES.labios;
    return CATEGORY_IMAGES.default;
  };

  const getCategoryDetails = (cat: string) => {
    const key = cat.toLowerCase();
    return CATEGORY_DETAILS[key] || CATEGORY_DETAILS.default;
  };

  // Fine-grained treatment image assigner to prevent repetitive images inside categories
  const getTreatmentImage = (nombreBase: string, categoria: string) => {
    const name = nombreBase.toLowerCase();
    const cat = categoria.toLowerCase();

    // Specific Eyebrows / Cejas treatments
    if (name.includes("lamination") || name.includes("laminado")) {
      return "/images/brow_lamination.png";
    }
    
    // Specific Facial treatments
    if (name.includes("hydrafacial")) {
      return "/images/hydrafacial.png";
    }
    if (name.includes("pink glow")) {
      return "/images/pink_glow.png";
    }
    if (name.includes("higiene facial") || name.includes("limpieza")) {
      return "/images/higiene_facial.png";
    }
    
    // Fallback to Category default images
    return getCategoryImage(categoria);
  };

  return (
    <div className="min-h-screen bg-bg-base text-text-primary relative overflow-hidden pb-24">
      {/* Background Orbs */}
      <div className="absolute top-[10%] left-[5%] w-[400px] h-[400px] bg-gold/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[20%] right-[5%] w-[350px] h-[350px] bg-gold/4 rounded-full blur-[150px] pointer-events-none" />

      {/* ════════ NAV ════════ */}
      <nav className="fixed top-0 w-full z-50 glass-strong">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <ChevronLeft className="w-5 h-5 text-gold group-hover:-translate-x-1 transition-transform" />
            <span className="font-display text-xl tracking-[0.2em] uppercase text-transparent bg-clip-text bg-gradient-to-r from-gold-light via-gold to-gold-dark font-bold">
              Milé Almanza
            </span>
          </Link>
          <Link href="/reservar" className="px-5 py-2.5 bg-gradient-to-r from-gold-dark via-gold to-gold-light text-black font-bold text-xs rounded-full hover:shadow-[0_0_25px_rgba(212,175,55,0.5)] transition-all hover:scale-105 tracking-wider uppercase">
            Agendar Cita
          </Link>
        </div>
      </nav>

      {/* Header Section */}
      <div className="relative pt-32 pb-12 text-center max-w-4xl mx-auto px-6">
        <span className="inline-block text-xs font-semibold text-gold tracking-[0.3em] uppercase mb-4">Catálogo de Armonización</span>
        
        {activeTab === "categorias" ? (
          <>
            <h1 className="font-display text-4xl md:text-6xl font-bold mb-4 tracking-tight">
              Diseño & <span className="text-transparent bg-clip-text bg-gradient-to-r from-gold-light to-gold italic inline-block pr-2">Estética Facial</span>
            </h1>
            <p className="text-text-secondary text-sm md:text-base max-w-xl mx-auto leading-relaxed">
              Selecciona una categoría para explorar nuestra selecta gama de tratamientos de alta costura, diseñados para realzar tu belleza natural.
            </p>
          </>
        ) : (
          <div className="animate-in fade-in duration-500">
            <button 
              onClick={() => setActiveTab("categorias")}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-bg-card border border-border-subtle text-text-secondary hover:text-gold hover:border-gold/30 text-xs font-bold uppercase tracking-wider mb-6 transition-all"
            >
              <ChevronLeft className="w-4 h-4" /> Volver a Categorías
            </button>
            {(() => {
              const titleLength = activeTab.length;
              const titleSizeClass = titleLength > 20
                ? "text-2xl sm:text-3xl md:text-4xl"
                : titleLength > 12
                ? "text-3xl sm:text-4xl md:text-5xl"
                : "text-4xl sm:text-5xl md:text-6xl";
              return (
                <h1 className={`font-display font-bold mb-4 tracking-tight capitalize ${titleSizeClass}`}>
                  {/* Added inline-block pr-2 to prevent italic font right-side clipping in Chrome/WebKit */}
                  Servicios de <span className="text-transparent bg-clip-text bg-gradient-to-r from-gold-light to-gold italic inline-block pr-2">{activeTab}</span>
                </h1>
              );
            })()}
            <p className="text-text-secondary text-sm md:text-base max-w-2xl mx-auto leading-relaxed italic">
              "{getCategoryDetails(activeTab).desc}"
            </p>

            {/* Quick Navigation Tabs for sub-switching */}
            <div className="flex flex-wrap items-center justify-center gap-2 mt-8 bg-bg-card/50 p-2 rounded-2xl border border-border-subtle max-w-2xl mx-auto backdrop-blur-sm">
              {uniqueCategories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveTab(cat)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                    activeTab === cat 
                      ? "bg-gradient-to-r from-gold-dark to-gold text-black shadow-md shadow-gold/20 font-extrabold" 
                      : "text-text-muted hover:text-gold"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-6 mt-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="w-10 h-10 border-2 border-gold border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-text-muted text-sm font-semibold">Cargando portafolio VIP...</p>
          </div>
        ) : activeTab === "categorias" ? (
          /* ════════ CATEGORIES SCREEN ════════ */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-in fade-in duration-500">
            {uniqueCategories.map(cat => {
              const groupedServices = getAgrupadosByCategory(cat);
              const servicesCount = groupedServices.length;
              
              // Get all active services in this category from the database
              const rawServicesInCat = servicios.filter(s => s.categoria.toLowerCase() === cat.toLowerCase());
              
              // Calculate dynamic duration range using true duration (duracionMin + bufferMin)
              const durations = rawServicesInCat.map(s => s.duracionMin + s.bufferMin);
              const minDur = durations.length > 0 ? Math.min(...durations) : 0;
              const maxDur = durations.length > 0 ? Math.max(...durations) : 0;
              
              const formatMinHrs = (mins: number) => {
                if (mins < 60) return `${mins} min`;
                const hrs = Math.floor(mins / 60);
                const rem = mins % 60;
                return rem > 0 ? `${hrs}h ${rem}m` : `${hrs}h`;
              };
              
              const durationDisplay = minDur === maxDur 
                ? formatMinHrs(minDur)
                : `${formatMinHrs(minDur)} - ${formatMinHrs(maxDur)}`;

              // Calculate dynamic price range
              const prices = rawServicesInCat.map(s => s.precio);
              const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
              const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;
              
              let priceDisplay = "";
              if (minPrice === 0 && maxPrice === 0) {
                priceDisplay = "¡Gratis!";
              } else if (minPrice === 0) {
                priceDisplay = `Desde Gratis`;
              } else if (minPrice === maxPrice) {
                priceDisplay = `$${minPrice.toLocaleString('es-CO')} COP`;
              } else {
                priceDisplay = `Desde $${minPrice.toLocaleString('es-CO')} COP`;
              }

              const details = getCategoryDetails(cat);
              
              return (
                <div 
                  key={cat}
                  onClick={() => setActiveTab(cat)}
                  className="bg-bg-card border border-border-subtle hover:border-gold/30 rounded-3xl overflow-hidden shadow-xl transition-all duration-500 hover:-translate-y-1.5 flex flex-col group cursor-pointer relative"
                >
                  {/* Category Image Header */}
                  <div className="relative h-56 w-full overflow-hidden bg-[#121214]">
                    <Image 
                      src={getCategoryImage(cat)} 
                      alt={cat} 
                      fill 
                      className="object-cover transition-transform duration-700 group-hover:scale-105" 
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-bg-card via-bg-card/20 to-transparent" />
                    
                    {/* Badge Count - PURE BLACK background with bold white text for maximum legibility */}
                    <div className="absolute top-4 right-4 px-3.5 py-1.5 bg-black text-white rounded-full flex items-center border border-white/20 shadow-lg z-10">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-white">
                        {servicesCount} {servicesCount === 1 ? 'Servicio' : 'Servicios'}
                      </span>
                    </div>
                  </div>

                  {/* Category Content */}
                  <div className="p-6 flex-1 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] text-gold font-bold uppercase tracking-[0.25em] mb-1.5 block">Colección Estética</span>
                      <h3 className="font-display text-2xl font-bold mb-3 capitalize group-hover:text-gold transition-colors flex items-center justify-between">
                        {cat}
                        <ArrowRight className="w-5 h-5 text-gold opacity-0 group-hover:opacity-100 group-hover:translate-x-1.5 transition-all" />
                      </h3>
                      <p className="text-sm text-text-secondary leading-relaxed mb-6 line-clamp-3">
                        {details.desc}
                      </p>
                    </div>

                    <div className="border-t border-border-subtle pt-4 flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-[9px] text-text-muted uppercase tracking-wider">Duración total</span>
                        <span className="text-xs font-semibold text-text-secondary flex items-center gap-1 mt-0.5">
                          <Clock className="w-3.5 h-3.5 text-gold/80" /> {durationDisplay}
                        </span>
                      </div>
                      <div className="flex flex-col text-right">
                        <span className="text-[9px] text-text-muted uppercase tracking-wider">Inversión</span>
                        <span className="text-xs font-bold text-gold mt-0.5">
                          {priceDisplay}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* ════════ TREATMENTS SCREEN (SELECTED CATEGORY) ════════ */
          <div className="animate-in slide-in-from-bottom-8 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {getAgrupadosByCategory(activeTab).map(grupo => {
                const isRange = grupo.minPrecio !== grupo.maxPrecio;
                
                return (
                  <div 
                    key={grupo.nombreBase} 
                    className="bg-bg-card border border-border-subtle hover:border-gold/30 rounded-3xl overflow-hidden shadow-xl transition-all duration-500 hover:-translate-y-1 flex flex-col group"
                  >
                    {/* Photo Header */}
                    <div className="relative h-64 w-full overflow-hidden bg-[#121214]">
                      <Image 
                        src={getTreatmentImage(grupo.nombreBase, grupo.categoria)} 
                        alt={grupo.nombreBase} 
                        fill 
                        className="object-cover transition-transform duration-750 group-hover:scale-105" 
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-bg-card via-transparent to-transparent" />
                      
                      {/* Left Badge: Category tag removed as requested ("ya no es necesario mostrar categorias, cejas etc") */}

                      {/* Right Badge: Professional variants indicator - PURE BLACK background with bold white text */}
                      {grupo.servicios.length > 1 ? (
                        <div className="absolute top-4 right-4 px-3.5 py-1.5 bg-black text-white rounded-full flex items-center gap-1.5 border border-white/20 shadow-lg">
                          <Users className="w-3.5 h-3.5 text-gold" />
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-white">Milé & Staff</span>
                        </div>
                      ) : null}
                    </div>

                    {/* Content */}
                    <div className="p-6 flex-1 flex flex-col justify-between">
                      <div>
                        <h3 className="font-display text-xl font-bold mb-2 group-hover:text-gold transition-colors">{grupo.nombreBase}</h3>
                        
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-text-muted mb-4">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-gold" /> {grupo.minDuracion} min
                          </span>
                          <span className="flex items-center gap-1">
                            <CreditCard className="w-3.5 h-3.5 text-gold" /> 
                            Abono 50%: {isRange 
                              ? `$${(grupo.minPrecio * 0.5).toLocaleString('es-CO')} - $${(grupo.maxPrecio * 0.5).toLocaleString('es-CO')}`
                              : `$${(grupo.minPrecio * 0.5).toLocaleString('es-CO')}`
                            }
                          </span>
                        </div>

                        <p className="text-sm text-text-secondary leading-relaxed mb-6">
                          Tratamiento estético avanzado e higiénico personalizado. Diseñado para ofrecer resultados totalmente naturales y duraderos utilizando insumos biocompatibles de alta fidelidad.
                        </p>
                      </div>

                      <div>
                        <div className="border-t border-border-subtle pt-4 flex items-center justify-between mb-6">
                          <div className="flex flex-col">
                            <span className="text-[10px] text-text-muted uppercase tracking-wider">Valor total</span>
                            <div className="flex items-baseline">
                              <span className={`font-bold text-transparent bg-clip-text bg-gradient-to-r from-gold-light via-gold to-gold-dark ${
                                isRange ? "text-xs sm:text-sm" : "text-base"
                              }`}>
                                {isRange 
                                  ? `$${grupo.minPrecio.toLocaleString('es-CO')} - $${grupo.maxPrecio.toLocaleString('es-CO')}`
                                  : `$${grupo.minPrecio.toLocaleString('es-CO')}`
                                }
                              </span>
                              <span className="text-[9px] font-bold text-text-muted uppercase tracking-wider ml-1">COP</span>
                            </div>
                          </div>
                          <div className="flex flex-col text-right items-end">
                            <span className="text-[10px] text-text-muted uppercase tracking-wider">Abono 50%</span>
                            <div className="flex items-baseline">
                              <span className={`font-bold text-gold ${
                                isRange ? "text-[11px] sm:text-xs" : "text-sm"
                              }`}>
                                {isRange 
                                  ? `$${(grupo.minPrecio * 0.5).toLocaleString('es-CO')} - $${(grupo.maxPrecio * 0.5).toLocaleString('es-CO')}`
                                  : `$${(grupo.minPrecio * 0.5).toLocaleString('es-CO')}`
                                }
                              </span>
                              <span className="text-[9px] font-bold text-text-muted uppercase tracking-wider ml-1">COP</span>
                            </div>
                          </div>
                        </div>

                        <Link 
                          href={`/reservar?servicio=${encodeURIComponent(grupo.nombreBase)}`} 
                          className="w-full py-3 bg-gradient-to-r from-gold-dark via-gold to-gold-light text-black font-bold text-xs uppercase tracking-wider rounded-xl shadow-md hover:shadow-lg hover:shadow-gold/15 transition-all flex items-center justify-center gap-2 group-hover:scale-[1.01]"
                        >
                          <Calendar className="w-4 h-4" /> Agendar este Servicio <ArrowRight className="w-4 h-4" />
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {getAgrupadosByCategory(activeTab).length === 0 && (
              <div className="text-center py-20 bg-bg-card/50 border border-border-subtle rounded-3xl">
                <LayoutGrid className="w-12 h-12 text-gold mx-auto mb-4 opacity-50" />
                <p className="text-text-secondary font-medium">No se encontraron tratamientos activos en esta categoría.</p>
                <button 
                  onClick={() => setActiveTab("categorias")}
                  className="mt-4 px-5 py-2.5 bg-gold text-black font-bold text-xs rounded-xl uppercase tracking-wider hover:bg-gold-light transition-colors"
                >
                  Volver al Panel de Categorías
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer Banner */}
      <div className="max-w-4xl mx-auto px-6 mt-20 text-center">
        <div className="p-8 md:p-12 glass border border-gold/20 rounded-3xl relative overflow-hidden">
          <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-gold/5 rounded-full blur-[60px]" />
          <h2 className="font-display text-2xl md:text-3xl font-bold mb-4">¿No encuentras lo que buscas?</h2>
          <p className="text-text-muted text-sm max-w-md mx-auto mb-6">
            Escríbenos directamente por WhatsApp para una asesoría de diseño personalizada completamente gratis.
          </p>
          <a 
            href="https://wa.me/573218406428" 
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3.5 bg-bg-surface hover:bg-gold/10 text-gold font-bold text-xs uppercase tracking-wider rounded-xl border border-gold/30 transition-all"
          >
            <Phone className="w-4 h-4" /> Chatear con Asesoría VIP
          </a>
        </div>
      </div>
    </div>
  );
}
