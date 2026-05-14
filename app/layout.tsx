import type { Metadata } from "next";
import "./globals.css";
import Navigation from "@/components/Navigation";

export const metadata: Metadata = {
  title: "AdMate Foresight — 성과 예측 시뮬레이터",
  description: "디지털 광고 성과를 예측하고 기준 데이터를 검토하는 AdMate Foresight",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-[#eef2ef] text-slate-950">
        <Navigation />
        <main className="flex-1 max-w-[1500px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </main>
      </body>
    </html>
  );
}
