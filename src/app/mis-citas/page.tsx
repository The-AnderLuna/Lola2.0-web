"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, User, Lock, Calendar, MessageSquare, AlertCircle, RefreshCw, CheckCircle } from "lucide-react";

import { Suspense } from "react";

function MisCitasContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("from") || "/portal";

  // Navigation states: 'phone' (input number) or 'otp' (input verification code)
  const [step, setStep] = useState<"phone" | "otp">("phone");

  // Input values
  const [codigoPais, setCodigoPais] = useState("+57");
  const [phone, setPhone] = useState("");
  const [otpCode, setOtpCode] = useState<string[]>(Array(6).fill(""));
  const otpInputsRef = useRef<HTMLInputElement[]>([]);

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Timer for OTP resend
  const [resendTimer, setResendTimer] = useState(0);

  // Handle countdown for resending OTP
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  // Focus the first OTP field when step changes to 'otp'
  useEffect(() => {
    if (step === "otp" && otpInputsRef.current[0]) {
      setTimeout(() => {
        otpInputsRef.current[0]?.focus();
      }, 100);
    }
  }, [step]);

  // Step 1: Request OTP
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    // Basic cleaning and validation
    const cleanPhone = phone.replace(/\D/g, "");
    
    // Robust country-based length validation (Colombia must be exactly 10; others >= 8)
    const isValidLength = codigoPais === "+57" ? cleanPhone.length === 10 : cleanPhone.length >= 8;
    if (!isValidLength) {
      if (codigoPais === "+57") {
        setError("El número de teléfono en Colombia debe tener exactamente 10 dígitos (ej. 3001234567)");
      } else {
        setError("El número de teléfono para este país debe tener al menos 8 dígitos");
      }
      return;
    }

    setLoading(true);

    try {
      const codeNum = codigoPais.replace(/\D/g, "");
      const fullPhone = `${codeNum}${cleanPhone}`;

      const res = await fetch("/api/auth/otp/enviar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telefono: fullPhone }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Ocurrió un error al enviar el código");
      }

      setSuccessMsg("Código enviado correctamente a tu WhatsApp.");
      setStep("otp");
      setResendTimer(60); // 60s cooldown
    } catch (err: any) {
      setError(err.message || "Error al conectar con el servidor");
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const fullCode = otpCode.join("");
    if (fullCode.length !== 6) {
      setError("Por favor ingresa los 6 dígitos del código de seguridad");
      return;
    }

    setLoading(true);

    try {
      const cleanPhone = phone.replace(/\D/g, "");
      const codeNum = codigoPais.replace(/\D/g, "");
      const fullPhone = `${codeNum}${cleanPhone}`;

      const res = await fetch("/api/auth/otp/verificar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          telefono: fullPhone,
          codigo: fullCode
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Código incorrecto o vencido");
      }

      setSuccessMsg("¡Ingreso exitoso! Redirigiendo a tu portal...");

      // Short delay to let user see success message, then redirect
      setTimeout(() => {
        router.push(returnTo);
        router.refresh();
      }, 1000);

    } catch (err: any) {
      setError(err.message || "Error al verificar el código");
      // Clear inputs on error to allow user to re-enter
      setOtpCode(Array(6).fill(""));
      otpInputsRef.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  // Handle individual OTP digit inputs
  const handleOtpChange = (index: number, value: string) => {
    const cleanVal = value.replace(/\D/g, "").slice(-1); // Only allow last digit
    const newOtp = [...otpCode];
    newOtp[index] = cleanVal;
    setOtpCode(newOtp);

    // Move to next input if filled
    if (cleanVal && index < 5) {
      otpInputsRef.current[index + 1]?.focus();
    }

    // Auto submit if last digit entered
    if (index === 5 && cleanVal && newOtp.join("").length === 6) {
      // Trigger submission by updating code array, will trigger in useEffect or manual check
      setTimeout(() => {
        // Find by code ref state to secure full value is read
        const finalCode = [...newOtp];
        finalCode[index] = cleanVal;
        if (finalCode.join("").length === 6) {
          setError(null);
          // Trigger verify programmatically
          const cleanPhone = phone.replace(/\D/g, "");
          const codeNum = codigoPais.replace(/\D/g, "");
          const fullPhone = `${codeNum}${cleanPhone}`;

          fetch("/api/auth/otp/verificar", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              telefono: fullPhone,
              codigo: finalCode.join("")
            }),
          }).then(async (res) => {
            const data = await res.json();
            if (res.ok) {
              setSuccessMsg("¡Ingreso exitoso! Redirigiendo a tu portal...");
              setTimeout(() => {
                router.push(returnTo);
                router.refresh();
              }, 1000);
            } else {
              setError(data.error || "Código incorrecto o vencido");
              setOtpCode(Array(6).fill(""));
              otpInputsRef.current[0]?.focus();
            }
          }).catch(() => {
            setError("Error al verificar el código");
          });
        }
      }, 50);
    }
  };

  // Handle OTP field backspaces
  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (!otpCode[index] && index > 0) {
        const newOtp = [...otpCode];
        newOtp[index - 1] = "";
        setOtpCode(newOtp);
        otpInputsRef.current[index - 1]?.focus();
      } else {
        const newOtp = [...otpCode];
        newOtp[index] = "";
        setOtpCode(newOtp);
      }
    }
  };

  // Handle OTP paste
  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text/plain");
    const cleanPasted = pastedData.replace(/\D/g, "").slice(0, 6);
    
    if (cleanPasted) {
      const newOtp = [...otpCode];
      for (let i = 0; i < 6; i++) {
        newOtp[i] = cleanPasted[i] || "";
      }
      setOtpCode(newOtp);
      
      const focusIndex = Math.min(cleanPasted.length, 5);
      otpInputsRef.current[focusIndex]?.focus();

      if (cleanPasted.length === 6) {
        setTimeout(() => {
          setError(null);
          const cleanPhone = phone.replace(/\D/g, "");
          const codeNum = codigoPais.replace(/\D/g, "");
          const fullPhone = `${codeNum}${cleanPhone}`;

          fetch("/api/auth/otp/verificar", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              telefono: fullPhone,
              codigo: cleanPasted
            }),
          }).then(async (res) => {
            const data = await res.json();
            if (res.ok) {
              setSuccessMsg("¡Ingreso exitoso! Redirigiendo a tu portal...");
              setTimeout(() => {
                router.push(returnTo);
                router.refresh();
              }, 1000);
            } else {
              setError(data.error || "Código incorrecto o vencido");
              setOtpCode(Array(6).fill(""));
              otpInputsRef.current[0]?.focus();
            }
          }).catch(() => {
            setError("Error al verificar el código");
          });
        }, 50);
      }
    }
  };

  // Format phone number for UI display (57XXXXXXXXXX or 10 digits nicely separated)
  const formatPhoneInput = (val: string) => {
    const clean = val.replace(/\D/g, "");
    // Display in blocks of 3-3-4
    if (clean.length <= 3) return clean;
    if (clean.length <= 6) return `${clean.slice(0, 3)} ${clean.slice(3)}`;
    return `${clean.slice(0, 3)} ${clean.slice(3, 6)} ${clean.slice(6, 10)}`;
  };

  return (
    <div className="relative min-h-screen flex flex-col justify-between overflow-hidden bg-black font-inter text-text-primary px-4">
      {/* Fondo Mesh de Luz Orgánica (Sin círculos rígidos) */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(212,175,55,0.06),transparent_45%),radial-gradient(circle_at_bottom_right,rgba(230,57,70,0.04),transparent_50%)] pointer-events-none" />

      {/* Header Fino */}
      <header className="w-full max-w-5xl mx-auto py-8 flex justify-between items-center z-10">
        <div className="flex items-center gap-2 group cursor-pointer" onClick={() => router.push("/")}>
          <span className="font-display font-bold tracking-[0.15em] text-sm uppercase text-transparent bg-clip-text bg-gradient-to-r from-gold-light via-gold to-gold-dark transition-all duration-300">
            Mile Almanza
          </span>
        </div>
        <button
          onClick={() => router.push("/reservar")}
          className="text-xs font-bold tracking-wider uppercase text-gold hover:text-gold-light border border-gold/30 hover:border-gold/60 rounded-full px-4 py-2 bg-gold/5 transition-all duration-300 active:scale-95 cursor-pointer hover:shadow-[0_0_15px_rgba(212,175,55,0.15)]"
        >
          Agendar Cita
        </button>
      </header>

      {/* Main Container */}
      <main className="flex-1 w-full max-w-md mx-auto flex flex-col justify-center py-12 z-10">
        <div className="glass-strong rounded-2xl p-8 relative overflow-hidden shadow-2xl border border-gold/20 animate-fade-in-up">

          {/* Decorative Gold Accent Bar */}
          <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-gold/60 to-transparent" />

          {/* Icono Superior: Rombo Diamante de Lujo */}
          <div className="w-12 h-12 rounded-2xl border border-gold/30 bg-gradient-to-br from-bg-surface to-bg-card flex items-center justify-center mx-auto mb-6 shadow-[0_8px_20px_rgba(212,175,55,0.15)] relative overflow-hidden group rotate-45">
            <div className="absolute inset-0 bg-gradient-to-tr from-gold/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="-rotate-45 relative z-10 flex items-center justify-center text-gold drop-shadow-[0_2px_6px_rgba(212,175,55,0.3)]">
              {step === "phone" ? (
                <User className="w-5 h-5" />
              ) : (
                <Lock className="w-5 h-5 animate-pulse" />
              )}
            </div>
          </div>

          {/* Encabezados Dinámicos */}
          <div className="text-center mb-8">
            <h1 className="font-display text-2xl font-bold tracking-wide text-text-primary mb-2">
              {step === "phone" ? "Mis Citas" : "Verificación"}
            </h1>
            <p className="text-sm text-text-secondary max-w-xs mx-auto leading-relaxed">
              {step === "phone"
                ? "Usa el número de WhatsApp con el que reservaste tu cita para ver tus agendamientos."
                : `Ingresa el código de 6 dígitos que enviamos a tu WhatsApp con terminación ${phone.replace(/\D/g, "").slice(-4)}.`}
            </p>
          </div>

          {/* Alertas de Mensajes y Errores */}
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-urgency/10 border border-red-urgency/20 flex items-start gap-3 animate-scale-in">
              <AlertCircle className="w-5 h-5 text-red-urgency shrink-0 mt-0.5" />
              <p className="text-xs text-red-urgency font-medium leading-relaxed">{error}</p>
            </div>
          )}

          {successMsg && (
            <div className="mb-6 p-4 rounded-xl bg-green-500/10 border border-green-500/20 flex items-start gap-3 animate-scale-in">
              <CheckCircle className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
              <p className="text-xs text-green-400 font-medium leading-relaxed">{successMsg}</p>
            </div>
          )}

          {/* PANTALLA 1: Solicitar OTP (Número de Teléfono) */}
          {step === "phone" && (
            <form onSubmit={handleRequestOtp} className="space-y-6">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary mb-2">
                  Número de Teléfono
                </label>
                <div className="relative flex rounded-xl border border-white/10 bg-bg-base/70 focus-within:border-gold/50 shadow-inner transition-colors duration-300 overflow-hidden">

                  {/* Selector de Código de País */}
                  <div className="relative flex items-center border-r border-white/5 bg-white/[0.01]">
                    <select
                      value={codigoPais}
                      onChange={(e) => setCodigoPais(e.target.value)}
                      disabled={loading}
                      className="bg-transparent pl-4 pr-6 py-3 text-sm text-text-primary focus:outline-none cursor-pointer appearance-none font-semibold tracking-wider"
                      style={{
                        WebkitAppearance: "none",
                        MozAppearance: "none",
                      }}
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
                    {/* Tiny custom arrow down indicator */}
                    <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-text-muted">
                      ▼
                    </div>
                  </div>

                  <input
                    type="tel"
                    required
                    disabled={loading}
                    placeholder="300 123 4567"
                    value={formatPhoneInput(phone)}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-transparent px-4 py-3 text-sm font-semibold tracking-widest text-text-primary placeholder:text-text-muted placeholder:tracking-normal focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-gold-dark via-gold to-gold-light hover:brightness-110 active:scale-[0.98] disabled:opacity-40 text-black font-bold uppercase tracking-wider text-xs py-3.5 px-6 rounded-xl transition-all duration-300 cursor-pointer shadow-[0_4px_20px_rgba(212,175,55,0.25)] hover:shadow-[0_4px_25px_rgba(212,175,55,0.4)]"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-black" />
                    Enviando código...
                  </>
                ) : (
                  <>
                    Solicitar Código
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* PANTALLA 2: Digitar Código OTP */}
          {step === "otp" && (
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="block text-center text-xs font-semibold uppercase tracking-wider text-text-secondary mb-3">
                  Código de Seguridad
                </label>

                {/* 6 OTP Inputs */}
                <div className="flex justify-between gap-2 max-w-xs mx-auto">
                  {otpCode.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => {
                        if (el) otpInputsRef.current[idx] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={1}
                      disabled={loading}
                      value={digit}
                      onChange={(e) => handleOtpChange(idx, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                      onPaste={handleOtpPaste}
                      className="w-11 h-12 text-center text-xl font-bold bg-bg-base/70 border border-white/10 rounded-xl focus:border-gold focus:ring-1 focus:ring-gold/30 focus:outline-none transition-all text-gold shadow-inner"
                    />
                  ))}
                </div>
              </div>



              {/* Reenviar Código y Cambiar Teléfono */}
              <div className="flex flex-col items-center gap-3 pt-2 text-xs">
                {resendTimer > 0 ? (
                  <span className="text-text-secondary font-medium">
                    ¿No recibiste el WhatsApp? Reenviar en{" "}
                    <strong className="text-gold font-semibold">{resendTimer}s</strong>
                  </span>
                ) : (
                  <button
                    onClick={handleRequestOtp}
                    disabled={loading}
                    className="text-gold hover:text-gold-light hover:underline font-semibold flex items-center gap-1 transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Reenviar código por WhatsApp
                  </button>
                )}

                <button
                  onClick={() => {
                    setStep("phone");
                    setOtpCode(Array(6).fill(""));
                    setError(null);
                    setSuccessMsg(null);
                  }}
                  disabled={loading}
                  className="text-text-secondary hover:text-text-primary transition-colors font-medium mt-1 hover:underline"
                >
                  Cambiar número de teléfono
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Informative Footer Box */}
        <div className="mt-8 text-center text-xs text-text-secondary leading-relaxed max-w-sm mx-auto">
          ¿Aún no tienes citas?{" "}
          <button
            type="button"
            onClick={() => router.push("/reservar")}
            className="text-gold hover:text-gold-light hover:underline font-semibold transition-colors"
          >
            Agenda aquí
          </button>
        </div>
      </main>

      {/* Footer Fino */}
      <footer className="w-full max-w-5xl mx-auto py-8 text-center text-xs text-text-muted border-t border-white/5 z-10 flex flex-col sm:flex-row justify-between items-center gap-4">
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

export default function MisCitasPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-bg-base flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <MisCitasContent />
    </Suspense>
  );
}
