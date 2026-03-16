import type { Metadata } from "next";
import { Suspense } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Navbar } from "@/components/navbar";
import { ThemeProvider } from "@/components/theme-provider"
import { NotificationBridge } from "@/components/notification-bridge";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SlugShare",
  description: "UCSC dining points sharing",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased h-screen flex flex-col overflow-hidden`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <Providers>
            <nav className="shrink-0">
              <Suspense fallback={<header className="border-b bg-background h-16" />}>
                <Navbar />
              </Suspense>
            </nav>
            <NotificationBridge />
            <main className="flex-1 min-h-0 overflow-auto">{children}</main>
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}
