import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "하늘이 수유 트래커",
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
