import Script from "next/script";
import "./globals.css";

export const metadata = {
  title: "위티 WeTee",
  description: "누구나 쓰는 실시간 택시 동승 매칭 & 정산 서비스",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "위티",
  },
  icons: {
    icon: "/icons/icon-192.svg",
    apple: "/icons/icon-192.svg",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#2563EB",
};

export default function RootLayout({ children }) {
  const kakaoAppKey = process.env.NEXT_PUBLIC_KAKAO_MAPS_APP_KEY || '2c63d05e29a82802c023313a723a8c65';
  const loadKakao = kakaoAppKey && kakaoAppKey !== '여기에-카카오-맵-자바스크립트-키' && !kakaoAppKey.includes('여기에');

  return (
    <html lang="ko" className="h-full">
      <body className="h-full flex flex-col antialiased">
        {children}
        {loadKakao && (
          <Script
            src={`https://dapi.kakao.com/v2/maps/sdk.js?appkey=${kakaoAppKey}&autoload=false&libraries=services`}
            strategy="afterInteractive"
          />
        )}
      </body>
    </html>
  );
}
