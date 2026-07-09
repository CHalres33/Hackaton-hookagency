import type { Metadata } from "next";
import { Space_Grotesk, Manrope, Caveat, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import NavRail from "@/components/NavRail";

const spaceGrotesk = Space_Grotesk({ variable: "--font-space", subsets: ["latin"], weight: ["500", "600", "700"] });
const manrope = Manrope({ variable: "--font-manrope", subsets: ["latin"], weight: ["400", "500", "600", "700", "800"] });
const caveat = Caveat({ variable: "--font-caveat", subsets: ["latin"], weight: ["500", "600", "700"] });
const jbMono = JetBrains_Mono({ variable: "--font-jbmono", subsets: ["latin"], weight: ["400", "500"] });

export const metadata: Metadata = {
  title: "Madeleine 🧁 — GTM émotionnel",
  description:
    "L'agent qui transforme les signaux d'achat en gestes qui créent de l'émotion.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${spaceGrotesk.variable} ${manrope.variable} ${caveat.variable} ${jbMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <Header />
        <div className="flex flex-1 min-h-0">
          <NavRail />
          <main className="flex-1 min-w-0 overflow-y-auto px-8 py-8">{children}</main>
        </div>
      </body>
    </html>
  );
}
