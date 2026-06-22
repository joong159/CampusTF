import Script from "next/script";
import "./globals.css";

export const metadata = {
  title: "대진대 택시 타자",
  description: "대진대 학생들을 위한 실시간 택시 동승 매칭 및 정산 서비스",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }) {
  const naverClientId = process.env.NEXT_PUBLIC_NAVER_MAPS_CLIENT_ID || 'e4er7uvr2b';

  return (
    <html lang="ko" className="h-full">
      <body className="h-full flex flex-col antialiased">
        {children}
        <Script
          src={`https://oapi.map.naver.com/openapi/v3/maps.js?ncpClientId=${naverClientId}`}
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
