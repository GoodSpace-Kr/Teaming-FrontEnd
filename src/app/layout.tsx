// src/app/layout.tsx
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import SessionWrapper from "@/component/SessionWrapper"; // 경로는 프로젝트에 맞게 조정
import MswProvider from "@/component/MswProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Teaming",
  description: "안녕하세요, 티밍입니다",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" style={{ colorScheme: "light" }}>
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <MswProvider>
          <SessionWrapper>{children}</SessionWrapper>
        </MswProvider>
      </body>
    </html>
  );
}
