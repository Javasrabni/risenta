import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "next-themes";
import { Inter } from "next/font/google";
import SmoothScrollProvider from "./component/smoothScroll/SmoothScroll";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Risenta",
  description: "Mentransformasi riset mandiri menjadi narasi pengetahuan publik sekaligus membuka ruang diskusi bagi pemuda Indonesia untuk mengeksplorasi ide inovatif.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${inter.variable} antialiased`}
      >
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} storageKey="theme">
          <SmoothScrollProvider>
            {children}
          </SmoothScrollProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
