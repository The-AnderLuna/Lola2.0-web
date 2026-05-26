import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Milé Almanza — Estudio Premium de Estética & Micropigmentación",
  description:
    "Resalta tu belleza con tecnología y arte. Micropigmentación de cejas, labios, pestañas, tratamientos faciales y más en un entorno exclusivo.",
  keywords: ["micropigmentación", "cejas", "pestañas", "labios", "tratamiento facial", "estética", "belleza", "Milé Almanza"],
  openGraph: {
    title: "Milé Almanza — Estudio Premium de Estética",
    description: "Resalta tu belleza con tecnología y arte.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${inter.variable} ${playfair.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
