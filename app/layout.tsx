import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CRM Consorcios — Minini",
  description: "CRM privado de propietarios de Minini Propiedades",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "CRM Minini",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#111111",
};

const THEME_INIT = `(function(){try{var t=localStorage.getItem('crm-consorcios-theme');if(t==='light'||t==='dark'){document.getElementById('crm-root').setAttribute('data-theme',t);}}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <div id="crm-root" data-theme="dark">
          {children}
        </div>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
      </body>
    </html>
  );
}
