import "./globals.css";

export const metadata = {
  title: "algosiX — 論理カードゲーム",
  description:
    "黒と白のカードを使った論理・推理カードゲーム「アルゴ」のWebアプリ。2〜4人対戦。",
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
