import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "아기 수유 트래커",
  description: "로그인 없이 공유되는 아기 수유 기록 MVP"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
