import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "還款試算與客戶資料",
  description: "以網址分隔使用者的還款試算與客戶資料系統"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hant">
      <body>{children}</body>
    </html>
  );
}
