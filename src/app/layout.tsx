import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Roboto_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "500", "700", "800"], variable: "--font-jetbrains-mono" });
const robotoMono = Roboto_Mono({ subsets: ["latin"], weight: ["500", "700"], variable: "--font-roboto-mono" });

export const metadata: Metadata = {
  title: "ICT Market Checklist",
  description: "Advanced ICT Trading Terminal",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="dark text-[14px]">
      <body className={`${inter.variable} ${jetbrainsMono.variable} ${robotoMono.variable} font-sans min-h-screen selection:bg-accent/30`}>
        {children}
      </body>
    </html>
  );
}
