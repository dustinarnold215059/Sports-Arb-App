import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/context/ThemeContext";
import { AuthProvider } from "../shared/auth/authProvider";
import { DemoProvider } from "@/context/DemoContext";
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";
import WebVitalsMonitor from "@/components/WebVitalsMonitor";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Sports Arbitrage Pro - Professional Betting Platform",
  description: "Professional sports betting arbitrage platform with real-time odds analysis, automated scanning, and advanced portfolio management.",
  manifest: "/manifest.json",
  themeColor: "#3b82f6",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Sports Arbitrage Pro"
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="light">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-white dark:bg-gray-900 text-gray-900 dark:text-white transition-colors`}
      >
        <AuthProvider>
          <DemoProvider>
            <ThemeProvider>
              <ServiceWorkerRegistration />
              <WebVitalsMonitor />
              {children}
            </ThemeProvider>
          </DemoProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
