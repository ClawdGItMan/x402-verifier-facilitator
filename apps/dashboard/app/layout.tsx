import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";

import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap"
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap"
});

export const metadata: Metadata = {
  title: "Verifier — Good work. Then payment.",
  description: "An interactive laboratory for verifying agent work before x402 payment: schema checks, LLM judging, consensus, and disputes. No wallet required.",
  openGraph: { title: "Verifier — Good work. Then payment.", description: "Explore how agents can verify work before releasing payment. An interactive x402 research prototype.", type: "website" }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${mono.variable}`}>
      <body>
        {children}
      </body>
    </html>
  );
}
