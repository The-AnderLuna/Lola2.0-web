import { Calendar as CalendarIcon, Clock, ArrowRight, Activity, MapPin } from "lucide-react";

export default function Dashboard() {
  // Mock data para UI inicial (Luego lo conectaremos a Supabase)
  const tratamientosActivos = [
    {
      id: "1",
      servicio: "Micropigmentación (VIP)",
      sesion_actual: 1,
      total_sesiones: 2,
      fecha_prox_ideal: "2026-05-19",
      estado: "ACTIVO",
      responsable: "Mile",
      notas: "Requiere retoque a los 40 días"
    },
    {
      id: "2",
      servicio: "Tratamiento Facial x4 Sesiones",
      sesion_actual: 3,
      total_sesiones: 4,
      fecha_prox_ideal: "2026-05-15",
      estado: "ACTIVO",
      responsable: "Staff",
      notas: "Sesión 3: Hidratación profunda"
    }
  ];

  const proximasCitas = [
    {
      id: "1",
      servicio: "Tratamiento Facial x4 Sesiones",
      fecha: "15 de Mayo, 2026",
      hora: "10:00 AM",
      responsable: "Staff",
      estado: "CONFIRMADA"
    }
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header Profile */}
      <div className="bg-white p-8 rounded-3xl border border-neutral-100 shadow-sm flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900 mb-2">¡Hola, Natalia! ✨</h1>
          <p className="text-neutral-500">Bienvenida a tu portal de belleza personal.</p>
        </div>
        <div className="h-16 w-16 bg-neutral-900 text-white rounded-full flex items-center justify-center text-xl font-bold shadow-md">
          N
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Treatments */}
        <div className="lg:col-span-2 space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Activity className="h-5 w-5 text-indigo-500" />
              Tus Tratamientos Activos
            </h2>
            <button className="text-sm font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1 transition-colors">
              Ver historial <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          <div className="grid gap-4">
            {tratamientosActivos.map((tratamiento) => (
              <div key={tratamiento.id} className="bg-white p-6 rounded-2xl border border-neutral-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                {/* Decoration */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-bl-full -mr-16 -mt-16 opacity-50 group-hover:scale-110 transition-transform"></div>
                
                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <span className="inline-block px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full mb-2">
                        {tratamiento.estado}
                      </span>
                      <h3 className="text-lg font-bold text-neutral-900">{tratamiento.servicio}</h3>
                      <p className="text-sm text-neutral-500 mt-1">Con {tratamiento.responsable}</p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-6 mb-2">
                    <div className="flex justify-between text-sm font-medium mb-2">
                      <span className="text-neutral-700">Progreso del paquete</span>
                      <span className="text-indigo-600 font-bold">{tratamiento.sesion_actual} de {tratamiento.total_sesiones} Sesiones</span>
                    </div>
                    <div className="h-3 w-full bg-neutral-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-indigo-500 rounded-full transition-all duration-1000 ease-out"
                        style={{ width: `${(tratamiento.sesion_actual / tratamiento.total_sesiones) * 100}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="mt-6 flex items-center justify-between border-t border-neutral-100 pt-4">
                    <div className="flex items-center gap-2 text-sm text-neutral-600">
                      <Clock className="h-4 w-4 text-neutral-400" />
                      <span>Siguiente sesión recomendada: <span className="font-semibold text-neutral-900">{tratamiento.fecha_prox_ideal}</span></span>
                    </div>
                    <button className="px-4 py-2 bg-black text-white text-sm font-medium rounded-lg hover:bg-neutral-800 transition-colors">
                      Agendar Sesión
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Upcoming Appointments */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-rose-500" />
            Próxima Cita
          </h2>

          {proximasCitas.map((cita) => (
            <div key={cita.id} className="bg-neutral-900 text-white p-6 rounded-3xl shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-bl-full -mr-16 -mt-16"></div>
              
              <div className="relative z-10">
                <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur-sm text-white text-xs font-bold rounded-full mb-4">
                  {cita.estado}
                </span>
                
                <h3 className="text-lg font-bold mb-6">{cita.servicio}</h3>
                
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-white/10 rounded-xl flex items-center justify-center">
                      <CalendarIcon className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="text-xs text-neutral-400 uppercase tracking-wider font-semibold">Fecha</p>
                      <p className="text-sm font-medium">{cita.fecha}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-white/10 rounded-xl flex items-center justify-center">
                      <Clock className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="text-xs text-neutral-400 uppercase tracking-wider font-semibold">Hora</p>
                      <p className="text-sm font-medium">{cita.hora}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-white/10 rounded-xl flex items-center justify-center">
                      <MapPin className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="text-xs text-neutral-400 uppercase tracking-wider font-semibold">Ubicación</p>
                      <p className="text-sm font-medium">Lola Salón (Con {cita.responsable})</p>
                    </div>
                  </div>
                </div>

                <button className="w-full mt-8 py-3 bg-white text-black text-sm font-bold rounded-xl hover:bg-neutral-100 transition-colors">
                  Ver Detalles
                </button>
              </div>
            </div>
          ))}

          {/* Quick Action */}
          <div className="bg-rose-50 border border-rose-100 p-6 rounded-3xl mt-6">
            <h3 className="font-bold text-rose-900 mb-2">¿Quieres un nuevo servicio?</h3>
            <p className="text-sm text-rose-700 mb-4">Explora nuestro catálogo y reserva tu próxima cita fácilmente.</p>
            <button className="w-full py-3 bg-rose-600 text-white text-sm font-bold rounded-xl hover:bg-rose-700 transition-colors shadow-sm">
              Agendar Nueva Cita
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
