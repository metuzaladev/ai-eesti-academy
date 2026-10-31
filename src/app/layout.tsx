import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin", "latin-ext"], variable: "--font-inter" });
const mono = JetBrains_Mono({ subsets: ["latin", "latin-ext"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "AI Eesti Academy",
  description: "Oskused ja mõju pärast koolitust",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="et" data-scroll-behavior="smooth" className={`${inter.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
