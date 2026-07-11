import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SkyProgressor",
  description: "Track your Hypixel SkyBlock progression",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}