import Link from "next/link";
import { User, Calendar as CalendarIcon, Clock, Sparkles, LogOut, ChevronRight } from "lucide-react";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 font-sans">
      {/* Sidebar Navigation */}
      <nav className="fixed top-0 left-0 h-screen w-64 bg-white border-r border-neutral-200 p-6 flex flex-col shadow-sm hidden md:flex">
        <div className="mb-10 flex items-center gap-3">
          <div className="h-10 w-10 bg-black rounded-full flex items-center justify-center">
            <Sparkles className="text-white h-5 w-5" />
          </div>
          <span className="font-semibold text-xl tracking-tight">Lola 2.0</span>
        </div>

        <div className="space-y-2 flex-grow">
          <Link href="/dashboard" className="flex items-center gap-3 px-4 py-3 rounded-xl bg-black text-white transition-all font-medium">
            <User className="h-5 w-5" />
            <span>Mi Perfil</span>
          </Link>
          <Link href="/dashboard/citas" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-neutral-100 text-neutral-600 transition-all font-medium">
            <CalendarIcon className="h-5 w-5" />
            <span>Mis Citas</span>
          </Link>
          <Link href="/dashboard/tratamientos" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-neutral-100 text-neutral-600 transition-all font-medium">
            <Clock className="h-5 w-5" />
            <span>Mis Tratamientos</span>
          </Link>
        </div>

        <div className="mt-auto">
          <button className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-rose-50 text-rose-600 w-full transition-all font-medium">
            <LogOut className="h-5 w-5" />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="md:ml-64 p-6 lg:p-10">
        <div className="max-w-5xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
