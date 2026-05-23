import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import Navigation from "@/components/Navigation";
import { getForesightSession } from "@/lib/auth/foresightSession";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
  adjustFontFallback: false,
});

export const metadata: Metadata = {
  title: "AdMate Foresight — 성과 예측 시뮬레이터",
  description: "디지털 광고 성과를 예측하고 기준 데이터를 검토하는 AdMate Foresight",
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    shortcut: "/favicon.svg",
    apple: "/brand/admate-foresight-mark.svg",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getForesightSession();

  return (
    <html lang="ko" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-[var(--background)] text-[var(--foresight-ink)]">
        <Navigation
          isAuthenticated={session !== null}
          sessionProfile={session?.profile ?? null}
          adminNavigation={session?.adminNavigation ?? null}
        />
        <main className="flex-1 max-w-[1500px] mx-auto w-full px-4 pb-6 pt-24 sm:px-6 lg:px-8">
          {children}
        </main>
      </body>
    </html>
  );
}
