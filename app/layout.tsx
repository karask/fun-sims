import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Simulation Hub — Ant Colony, Solar System & City Life",
  description: "Explore living colonies, planetary orbits, and a city full of daily decisions. Observe, experiment, and discover the rules behind complex worlds.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
