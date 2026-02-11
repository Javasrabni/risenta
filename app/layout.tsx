import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "next-themes";
import { Inter } from "next/font/google";
import SmoothScrollProvider from "@/components/layout/smoothScroll/SmoothScroll";
import Navbar from "@/components/layout/navbar";
import Script from "next/script";

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
  title: "Risentta - Independent Research & Writing Platform",
  description: "Mentransformasi riset mandiri menjadi narasi pengetahuan publik sekaligus membuka ruang diskusi bagi pemuda Indonesia untuk mengeksplorasi ide inovatif.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* GSC */}
        <meta name="google-site-verification" content="kpF9HB07hQqKfnwyF1hMfW-7Sssy0GSFH7eSAL9XKrE" />

        {/* Google Analytics */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-4WC0BNRMNV"
          strategy="afterInteractive"
        />
        <Script id="ga-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-4WC0BNRMNV');
          `}
        </Script>
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${inter.variable} antialiased`}
      >
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} storageKey="theme">
          <SmoothScrollProvider>
            {/* NAVBAR */}
            <div className='fixed bottom-8 z-100 left-0 right-0 flex items-center justify-center'>
              <Navbar />
            </div>
            {children}
          </SmoothScrollProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
