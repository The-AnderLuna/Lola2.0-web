"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Calendar, ArrowRight, Star, MapPin, Phone, AtSign, ChevronDown } from "lucide-react";
import { RepositorioConfiguracion } from "@/adaptadores/repositorios/RepositorioConfiguracion";

/* ── Scroll-reveal hook ── */
function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { el.classList.add("visible"); obs.unobserve(el); } },
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return ref;
}


const SERVICES = [
  { title: "Micropigmentación de Cejas", desc: "Diseño hiperrealista pelo a pelo con tecnología de última generación.", img: "/images/micropigmentation.png", price: "Desde $150.000" },
  { title: "Tratamiento Facial Premium", desc: "Limpieza profunda con tecnología de punta y mascarilla personalizada.", img: "/images/facial.png", price: "Desde $80.000" },
  { title: "Extensiones de Pestañas", desc: "Volumen ruso, clásicas y efecto mojado. Mirada impactante garantizada.", img: "/images/lashes.png", price: "Desde $60.000" },
  { title: "Micropigmentación de Labios", desc: "Color natural y definición perfecta. Labios con vida las 24 horas.", img: "/images/lips.png", price: "Desde $200.000" },
];

const TESTIMONIALS = [
  { name: "Carolina M.", text: "Mile es una artista. Mis cejas quedaron absolutamente perfectas, naturales y elegantes. ¡La mejor decisión!", rating: 5 },
  { name: "Valentina R.", text: "El tratamiento facial me dejó la piel increíble. El ambiente del estudio es otro nivel de lujo.", rating: 5 },
  { name: "Daniela G.", text: "Las pestañas me quedaron espectaculares. Atención premium de principio a fin. 100% recomendada.", rating: 5 },
  { name: "Marcela S.", text: "La micropigmentación de labios fue impecable. Se nota la experiencia y el profesionalismo de Mile.", rating: 5 },
];

export default function Home() {
  const heroRef = useReveal();
  const servicesRef = useReveal();
  const aboutRef = useReveal();
  const coursesRef = useReveal();
  const galleryRef = useReveal();
  const testimonialsRef = useReveal();
  const ctaRef = useReveal();

  const [wppNumber, setWppNumber] = useState<string>("573218406428");

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const repo = new RepositorioConfiguracion();
        const config = await repo.obtenerConfiguracion();
        if (config?.whatsapp_numero) {
          setWppNumber(config.whatsapp_numero.replace(/\D/g, ''));
        }
      } catch (e) {
        console.error("Error al obtener la configuración", e);
      }
    };
    fetchConfig();
  }, []);

  return (
    <div className="min-h-screen bg-bg-base text-text-primary relative overflow-hidden">
      {/* ════════ NAV ════════ */}
      <nav className="fixed top-0 w-full z-50 glass-strong">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <span className="font-display text-xl md:text-2xl tracking-[0.2em] uppercase text-transparent bg-clip-text bg-gradient-to-r from-gold-light via-gold to-gold-dark font-bold">
              Mile Almanza
            </span>
          </Link>
          <div className="hidden lg:flex items-center gap-8">
            <a href="#inicio" className="text-sm font-semibold text-text-secondary hover:text-gold transition-colors tracking-wider uppercase">Inicio</a>
            <a href="#servicios" className="text-sm font-semibold text-text-secondary hover:text-gold transition-colors tracking-wider uppercase">Servicios</a>
            <a href="#sobre-mi" className="text-sm font-semibold text-text-secondary hover:text-gold transition-colors tracking-wider uppercase">Sobre Mí</a>
            <a href="#cursos" className="text-sm font-semibold text-text-secondary hover:text-gold transition-colors tracking-wider uppercase">Cursos</a>
            <a href="#galeria" className="text-sm font-semibold text-text-secondary hover:text-gold transition-colors tracking-wider uppercase">Resultados</a>
            <a href="#testimonios" className="text-sm font-semibold text-text-secondary hover:text-gold transition-colors tracking-wider uppercase">Testimonios</a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/reservar" className="px-5 py-2.5 bg-gradient-to-r from-gold-dark via-gold to-gold-light text-black font-bold text-xs rounded-full hover:shadow-[0_0_25px_rgba(212,175,55,0.5)] transition-all hover:scale-105 tracking-wider uppercase">
              Agendar Cita
            </Link>
            <Link href="/mis-citas" className="hidden md:block text-xs font-semibold text-text-muted hover:text-gold transition-colors tracking-wider uppercase">
              Ver Mis Citas
            </Link>
          </div>
        </div>
      </nav>

      {/* ════════ HERO ════════ */}
      <section id="inicio" className="relative min-h-screen flex items-center justify-center overflow-hidden grain-overlay">
        {/* Background media with video and image fallback */}
        <div className="absolute inset-0 z-0 bg-[#060607]">

          <Image src="/images/hero.png" alt="Mile Almanza Studio" fill className="object-cover opacity-35 mix-blend-overlay z-0" priority />
          <div className="absolute inset-0 bg-gradient-to-b from-bg-base/85 via-bg-base/40 to-bg-base" />
          <div className="absolute inset-0 bg-gradient-to-r from-bg-base/70 via-transparent to-bg-base/70" />
        </div>


        {/* Content */}
        <div ref={heroRef} className="reveal relative z-10 text-center px-6 max-w-5xl mx-auto pt-24">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-8 animate-fade-in-up">
            <span className="w-2 h-2 bg-gold rounded-full animate-pulse" />
            <span className="text-xs font-semibold text-gold tracking-[0.25em] uppercase">Estudio Premium de Estética</span>
          </div>

          <h1 className="font-display text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold leading-[0.95] mb-6 tracking-tight">
            <span className="block text-text-primary">Resalta Tu</span>
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-gold-light via-gold to-gold-dark italic">
              Belleza
            </span>
          </h1>

          <p className="text-lg md:text-xl text-text-secondary max-w-2xl mx-auto mb-4 leading-relaxed font-light">
            Con Tecnología & Arte
          </p>
          <p className="text-sm md:text-base text-text-muted max-w-xl mx-auto mb-10 leading-relaxed">
            Micropigmentación, tratamientos faciales y estética avanzada en un entorno exclusivo diseñado para ti.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/reservar" className="group flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-gold-dark via-gold to-gold-light text-black font-bold text-base rounded-full hover:shadow-[0_0_40px_rgba(212,175,55,0.5)] transition-all hover:scale-105 animate-pulse-gold">
              <Calendar className="h-5 w-5" />
              Agendar mi Cita
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <a href="#servicios" className="flex items-center gap-2 px-8 py-4 glass text-gold font-bold text-base rounded-full hover:bg-gold/10 transition-all group">
              Ver Servicios
              <ChevronDown className="h-4 w-4 group-hover:translate-y-1 transition-transform" />
            </a>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-6 mt-16 max-w-lg mx-auto">
            {[["5+", "Años de Exp."], ["2K+", "Clientas Felices"], ["15+", "Tratamientos"]].map(([val, label]) => (
              <div key={label} className="text-center">
                <p className="font-display text-2xl md:text-3xl font-bold text-gold">{val}</p>
                <p className="text-xs text-text-muted mt-1 uppercase tracking-wider">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Scroll hint */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2 animate-bounce">
          <span className="text-[10px] text-text-muted uppercase tracking-[0.3em]">Scroll</span>
          <ChevronDown className="w-4 h-4 text-gold" />
        </div>
      </section>

      {/* ════════ SERVICIOS ════════ */}
      <section id="servicios" className="relative py-24 md:py-32">
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-gold/30 to-transparent" />
        <div ref={servicesRef} className="reveal max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="inline-block text-xs font-semibold text-gold tracking-[0.3em] uppercase mb-4">Nuestros Tratamientos</span>
            <h2 className="font-display text-4xl md:text-5xl font-bold text-text-primary mb-4">
              Servicios <span className="text-transparent bg-clip-text bg-gradient-to-r from-gold-light to-gold italic">Exclusivos</span>
            </h2>
            <p className="text-text-secondary max-w-xl mx-auto">Cada tratamiento es una obra de arte personalizada para realzar tu belleza natural.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 stagger">
            {SERVICES.map((s, i) => (
              <Link href="/reservar" key={s.title} className="group relative rounded-3xl overflow-hidden border border-border-subtle hover:border-gold/40 transition-all duration-500 hover:shadow-[0_0_40px_rgba(212,175,55,0.1)] bg-bg-card">
                <div className="relative h-64 overflow-hidden">
                  <Image src={s.img} alt={s.title} fill className="object-cover transition-transform duration-700 group-hover:scale-110" />
                  <div className="absolute inset-0 bg-gradient-to-t from-bg-card via-bg-card/40 to-transparent" />
                  <div className="absolute top-4 right-4 px-3 py-1.5 glass rounded-full">
                    <span className="text-xs font-bold text-gold">{s.price}</span>
                  </div>
                </div>
                <div className="p-6 relative">
                  <h3 className="font-display text-xl font-bold text-text-primary group-hover:text-gold transition-colors mb-2">{s.title}</h3>
                  <p className="text-sm text-text-secondary leading-relaxed mb-4">{s.desc}</p>
                  <span className="inline-flex items-center gap-2 text-gold text-sm font-semibold group-hover:gap-3 transition-all">
                    Agendar Este Servicio <ArrowRight className="w-4 h-4" />
                  </span>
                </div>
              </Link>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link href="/servicios" target="_blank" className="inline-flex items-center gap-2 px-8 py-4 glass text-gold font-bold rounded-full hover:bg-gold/10 transition-all group text-sm tracking-wider uppercase">
              Ver Todos los Servicios (Ver Más)
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </section>

      {/* ════════ MARQUEE ════════ */}
      <div className="relative py-6 overflow-hidden border-y border-border-subtle bg-bg-card/30">
        <div className="flex whitespace-nowrap" style={{ animation: "marquee 30s linear infinite" }}>
          {[...Array(2)].map((_, j) => (
            <div key={j} className="flex items-center gap-8 px-4">
              {["Micropigmentación", "Cejas", "Pestañas", "Labios", "Facial Premium", "Depilación Láser", "Medicina Estética", "Corporal"].map(t => (
                <span key={`${j}-${t}`} className="flex items-center gap-3 text-text-muted/50 font-display text-lg tracking-widest uppercase">
                  <Star className="w-3.5 h-3.5 text-gold/20 fill-gold/5" /> {t}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ════════ SOBRE MÍ ════════ */}
      <section id="sobre-mi" className="relative py-24 md:py-32">
        <div ref={aboutRef} className="reveal max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div className="relative">
              <div className="relative rounded-3xl overflow-hidden aspect-[3/4] max-w-md mx-auto lg:mx-0">
                <Image src="/images/about.png" alt="Mile Almanza" fill className="object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-bg-base/60 to-transparent" />
              </div>
              <div className="absolute -bottom-6 -right-6 w-32 h-32 border-2 border-gold/20 rounded-3xl" />
              <div className="absolute -top-6 -left-6 w-24 h-24 border-2 border-gold/10 rounded-2xl" />
            </div>
            <div>
              <span className="inline-block text-xs font-semibold text-gold tracking-[0.3em] uppercase mb-4">Conoce a</span>
              <h2 className="font-display text-4xl md:text-5xl font-bold text-text-primary mb-6 leading-tight">
                Mile <span className="text-transparent bg-clip-text bg-gradient-to-r from-gold-light to-gold italic">Almanza</span>
              </h2>
              <p className="text-text-secondary leading-relaxed mb-4">
                Especialista en micropigmentación y estética avanzada con más de 5 años de experiencia transformando la confianza de miles de mujeres.
              </p>
              <p className="text-text-secondary leading-relaxed mb-8">
                Cada procedimiento es realizado con técnicas de vanguardia, equipos de última generación y un compromiso absoluto con la excelencia. Mi estudio es tu espacio seguro para descubrir la mejor versión de ti.
              </p>
              <div className="grid grid-cols-2 gap-4 mb-8">
                {[["Técnica Avanzada", "Certificaciones internacionales"], ["Equipo Premium", "Tecnología de última generación"], ["Atención VIP", "Experiencia personalizada"], ["Resultados", "Naturales y duraderos"]].map(([t, d]) => (
                  <div key={t} className="p-4 glass rounded-2xl">
                    <h4 className="text-sm font-bold text-gold mb-1">{t}</h4>
                    <p className="text-xs text-text-muted">{d}</p>
                  </div>
                ))}
              </div>
              <Link href="/reservar" className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-gold-dark via-gold to-gold-light text-black font-bold rounded-full hover:shadow-[0_0_30px_rgba(212,175,55,0.5)] transition-all hover:scale-105 text-sm tracking-wider uppercase">
                <Calendar className="w-4 h-4" /> Agenda Conmigo
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ════════ CURSOS Y MASTERCLASSES ════════ */}
      <section id="cursos" className="relative py-24 md:py-32 border-t border-border-subtle bg-bg-card/10">
        <div ref={coursesRef} className="reveal max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="inline-block text-xs font-semibold text-gold tracking-[0.3em] uppercase mb-4">Aprende con Mile</span>
            <h2 className="font-display text-4xl md:text-5xl font-bold text-text-primary mb-4">
              Cursos & <span className="text-transparent bg-clip-text bg-gradient-to-r from-gold-light to-gold italic">Masterclasses</span>
            </h2>
            <p className="text-text-secondary max-w-xl mx-auto">Conviértete en un profesional de la micropigmentación y la estética facial de la mano de una experta con técnicas exclusivas.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* Curso 1 */}
            <div className="bg-bg-card border border-border-subtle hover:border-gold/30 rounded-3xl p-8 transition-all duration-500 hover:shadow-[0_0_40px_rgba(212,175,55,0.1)] relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-gold/5 to-transparent rounded-bl-full pointer-events-none" />
              <div className="flex items-center gap-2 text-gold text-xs font-semibold tracking-wider uppercase mb-4">
                <Calendar className="w-4 h-4" /> 3 Días Intensivos
              </div>
              <h3 className="font-display text-2xl font-bold text-text-primary mb-2 group-hover:text-gold transition-colors">Masterclass de Micropigmentación Inicial</h3>
              <p className="text-xs text-text-muted mb-4">Aprende diseño, colorimetría, visajismo y micropigmentación de cejas desde cero.</p>
              <div className="space-y-3 mb-8 text-xs text-text-secondary">
                <div className="flex items-center gap-2">✓ Material teórico-práctico premium</div>
                <div className="flex items-center gap-2">✓ Práctica real supervisada por Mile</div>
                <div className="flex items-center gap-2">✓ Kit inicial completo incluido</div>
                <div className="flex items-center gap-2">✓ Certificación internacional</div>
              </div>
              <div className="flex items-center justify-between border-t border-border-subtle pt-6">
                <div>
                  <span className="text-[10px] text-text-muted block uppercase">Precio del Curso</span>
                  <span className="text-xl font-bold text-gold">$1.200.000 COP</span>
                </div>
                <a href={`https://wa.me/${wppNumber}?text=Hola%20Mile!%20Deseo%20más%20información%20sobre%20la%20Masterclass%20de%20Micropigmentación%20Inicial`} target="_blank" rel="noopener noreferrer" className="px-5 py-3 bg-gradient-to-r from-gold-dark via-gold to-gold-light text-black font-bold text-xs uppercase tracking-wider rounded-xl transition-all hover:scale-105">
                  Consultar Cupos
                </a>
              </div>
            </div>

            {/* Curso 2 */}
            <div className="bg-bg-card border border-border-subtle hover:border-gold/30 rounded-3xl p-8 transition-all duration-500 hover:shadow-[0_0_40px_rgba(212,175,55,0.1)] relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-gold/5 to-transparent rounded-bl-full pointer-events-none" />
              <div className="flex items-center gap-2 text-gold text-xs font-semibold tracking-wider uppercase mb-4">
                <Calendar className="w-4 h-4" /> 1 Día Intensivo
              </div>
              <h3 className="font-display text-2xl font-bold text-text-primary mb-2 group-hover:text-gold transition-colors">Perfeccionamiento de Cejas Híbridas</h3>
              <p className="text-xs text-text-muted mb-4">Especialización para profesionales en técnicas avanzadas de sombreado y trazos hiperrealistas.</p>
              <div className="space-y-3 mb-8 text-xs text-text-secondary">
                <div className="flex items-center gap-2">✓ Corrección de trabajos anteriores</div>
                <div className="flex items-center gap-2">✓ Pigmentología avanzada y agujas</div>
                <div className="flex items-center gap-2">✓ Modelo real de práctica</div>
                <div className="flex items-center gap-2">✓ Certificado de especialización</div>
              </div>
              <div className="flex items-center justify-between border-t border-border-subtle pt-6">
                <div>
                  <span className="text-[10px] text-text-muted block uppercase">Precio del Curso</span>
                  <span className="text-xl font-bold text-gold">$800.000 COP</span>
                </div>
                <a href={`https://wa.me/${wppNumber}?text=Hola%20Mile!%20Deseo%20más%20información%20sobre%20el%20curso%20de%20Perfeccionamiento%20de%20Cejas%20Híbridas`} target="_blank" rel="noopener noreferrer" className="px-5 py-3 bg-gradient-to-r from-gold-dark via-gold to-gold-light text-black font-bold text-xs uppercase tracking-wider rounded-xl transition-all hover:scale-105">
                  Consultar Cupos
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════ ANTES Y DESPUÉS ════════ */}
      <section id="galeria" className="relative py-24 md:py-32 border-t border-border-subtle bg-bg-card/20">
        <div ref={galleryRef} className="reveal max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="inline-block text-xs font-semibold text-gold tracking-[0.3em] uppercase mb-4">Casos Reales</span>
            <h2 className="font-display text-4xl md:text-5xl font-bold text-text-primary mb-4">
              Resultados <span className="text-transparent bg-clip-text bg-gradient-to-r from-gold-light to-gold italic">Naturales</span>
            </h2>
            <p className="text-text-secondary max-w-xl mx-auto">Resultados visibles e inmediatos. Mira el cambio de nuestras clientas reales antes de agendar.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Caso 1: Cejas */}
            <div className="bg-bg-card border border-border-subtle rounded-3xl overflow-hidden shadow-lg hover:border-gold/20 transition-all duration-300">
              <div className="grid grid-cols-2 gap-1 p-2 bg-[#101012]">
                <div className="relative h-56 rounded-2xl overflow-hidden">
                  <Image src="/images/micropigmentation.png" alt="Antes de Cejas" fill className="object-cover opacity-60 filter grayscale" />
                  <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/75 rounded text-[10px] font-bold text-white uppercase tracking-wider">Antes</div>
                </div>
                <div className="relative h-56 rounded-2xl overflow-hidden border border-gold/30">
                  <Image src="/images/micropigmentation.png" alt="Después de Cejas" fill className="object-cover" />
                  <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-gold/90 text-black rounded text-[10px] font-bold uppercase tracking-wider">Después</div>
                </div>
              </div>
              <div className="p-4">
                <h4 className="font-bold text-sm text-text-primary">Micropigmentación de Cejas</h4>
                <p className="text-xs text-text-muted mt-1">Diseño hiperrealista efecto sombreado que rellena espacios vacíos.</p>
              </div>
            </div>

            {/* Caso 2: Labios */}
            <div className="bg-bg-card border border-border-subtle rounded-3xl overflow-hidden shadow-lg hover:border-gold/20 transition-all duration-300">
              <div className="grid grid-cols-2 gap-1 p-2 bg-[#101012]">
                <div className="relative h-56 rounded-2xl overflow-hidden">
                  <Image src="/images/lips.png" alt="Antes de Labios" fill className="object-cover opacity-60 filter grayscale" />
                  <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/75 rounded text-[10px] font-bold text-white uppercase tracking-wider">Antes</div>
                </div>
                <div className="relative h-56 rounded-2xl overflow-hidden border border-gold/30">
                  <Image src="/images/lips.png" alt="Después de Labios" fill className="object-cover" />
                  <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-gold/90 text-black rounded text-[10px] font-bold uppercase tracking-wider">Después</div>
                </div>
              </div>
              <div className="p-4">
                <h4 className="font-bold text-sm text-text-primary">Efecto Labios Blushing</h4>
                <p className="text-xs text-text-muted mt-1">Coloración sutil que aporta vida y definición sin necesidad de labial diario.</p>
              </div>
            </div>

            {/* Caso 3: Pestañas */}
            <div className="bg-bg-card border border-border-subtle rounded-3xl overflow-hidden shadow-lg hover:border-gold/20 transition-all duration-300">
              <div className="grid grid-cols-2 gap-1 p-2 bg-[#101012]">
                <div className="relative h-56 rounded-2xl overflow-hidden">
                  <Image src="/images/lashes.png" alt="Antes de Pestañas" fill className="object-cover opacity-60 filter grayscale" />
                  <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/75 rounded text-[10px] font-bold text-white uppercase tracking-wider">Antes</div>
                </div>
                <div className="relative h-56 rounded-2xl overflow-hidden border border-gold/30">
                  <Image src="/images/lashes.png" alt="Después de Pestañas" fill className="object-cover" />
                  <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-gold/90 text-black rounded text-[10px] font-bold uppercase tracking-wider">Después</div>
                </div>
              </div>
              <div className="p-4">
                <h4 className="font-bold text-sm text-text-primary">Efecto Volumen Ruso</h4>
                <p className="text-xs text-text-muted mt-1">Mirada expresiva e impactante que resalta de forma sofisticada.</p>
              </div>
            </div>
          </div>

          <div className="text-center mt-12">
            <a href="https://instagram.com/milealmanza" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-8 py-4 glass text-gold font-bold rounded-full hover:bg-gold/10 transition-all group text-sm tracking-wider uppercase">
              Ver más casos en Instagram <AtSign className="w-4 h-4" />
            </a>
          </div>
        </div>
      </section>

      {/* ════════ TESTIMONIOS ════════ */}
      <section id="testimonios" className="relative py-24 md:py-32 bg-bg-card/30">
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-gold/20 to-transparent" />
        <div ref={testimonialsRef} className="reveal max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="inline-block text-xs font-semibold text-gold tracking-[0.3em] uppercase mb-4">Testimonios</span>
            <h2 className="font-display text-4xl md:text-5xl font-bold text-text-primary mb-4">
              Lo Que Dicen Nuestras <span className="text-transparent bg-clip-text bg-gradient-to-r from-gold-light to-gold italic">Clientas</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 stagger">
            {TESTIMONIALS.map((t, i) => (
              <div key={i} className="p-6 glass rounded-3xl hover:border-gold/30 transition-all duration-500 group flex flex-col">
                <div className="flex gap-1 mb-4">
                  {[...Array(t.rating)].map((_, j) => <Star key={j} className="w-4 h-4 fill-gold text-gold" />)}
                </div>
                <p className="text-sm text-text-secondary leading-relaxed mb-6 flex-1">&ldquo;{t.text}&rdquo;</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gold-dark to-gold flex items-center justify-center text-black font-bold text-sm">
                    {t.name[0]}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-text-primary">{t.name}</p>
                    <p className="text-xs text-text-muted">Cliente verificada</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════ CTA FINAL ════════ */}
      <section className="relative py-24 md:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-bg-base via-bg-card to-bg-base" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gold/5 rounded-full blur-[150px] pointer-events-none" />
        <div ref={ctaRef} className="reveal relative z-10 max-w-3xl mx-auto px-6 text-center">
          <Star className="w-10 h-10 text-gold/80 fill-gold/10 mx-auto mb-6 animate-float" />
          <h2 className="font-display text-4xl md:text-6xl font-bold text-text-primary mb-6 leading-tight">
            Tu Transformación <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-gold-light via-gold to-gold-dark italic">Comienza Aquí</span>
          </h2>
          <p className="text-text-secondary mb-10 max-w-lg mx-auto">Reserva tu cita online en segundos. Elige el servicio, la fecha y la hora que mejor se acomode a tu agenda.</p>
          <Link href="/reservar" className="inline-flex items-center gap-3 px-10 py-5 bg-gradient-to-r from-gold-dark via-gold to-gold-light text-black font-bold text-lg rounded-full hover:shadow-[0_0_50px_rgba(212,175,55,0.5)] transition-all hover:scale-105 animate-pulse-gold">
            <Calendar className="w-5 h-5" /> Reservar Ahora <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* ════════ FOOTER ════════ */}
      <footer className="relative border-t border-border-subtle bg-bg-card/50 backdrop-blur-sm py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-10">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="font-display text-lg tracking-[0.2em] uppercase text-transparent bg-clip-text bg-gradient-to-r from-gold-light to-gold font-bold">Mile Almanza</span>
              </div>
              <p className="text-sm text-text-muted leading-relaxed">Estudio premium de estética y micropigmentación. Tu belleza, nuestra pasión.</p>
            </div>
            <div>
              <h4 className="text-sm font-bold text-gold uppercase tracking-wider mb-4">Contacto</h4>
              <div className="space-y-3">
                <a href="tel:+573000000000" className="flex items-center gap-2 text-sm text-text-secondary hover:text-gold transition-colors">
                  <Phone className="w-4 h-4" /> +57 300 000 0000
                </a>
                <a href="#" className="flex items-center gap-2 text-sm text-text-secondary hover:text-gold transition-colors">
                  <MapPin className="w-4 h-4" /> Bogotá, Colombia
                </a>
                <a href="#" className="flex items-center gap-2 text-sm text-text-secondary hover:text-gold transition-colors">
                  <AtSign className="w-4 h-4" /> @milealmanza
                </a>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-bold text-gold uppercase tracking-wider mb-4">Enlaces</h4>
              <div className="space-y-3">
                <Link href="/reservar" className="block text-sm text-text-secondary hover:text-gold transition-colors">Agendar Cita</Link>
                <a href="#servicios" className="block text-sm text-text-secondary hover:text-gold transition-colors">Servicios</a>
                <a href="#sobre-mi" className="block text-sm text-text-secondary hover:text-gold transition-colors">Sobre Mí</a>
              </div>
            </div>
          </div>
          <div className="border-t border-border-subtle pt-6 text-center">
            <p className="text-xs text-text-muted">© {new Date().getFullYear()} Mile Almanza — Estudio Premium de Estética. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
