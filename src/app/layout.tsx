import type { Metadata } from "next";
import "./globals.css";
import { QueryProvider } from "./providers";
import { Header } from "@/components/Header";

export const metadata: Metadata = {
  title: "OP Tracker – One Piece TCG Inventory",
  description: "Browse and manage your One Piece TCG card inventory",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='light'||t==='dark'){document.documentElement.classList.toggle('dark',t==='dark');document.documentElement.classList.toggle('light',t==='light');}}catch(e){}})();`,
          }}
        />
      </head>
      <body>
        <QueryProvider>
          <div className="min-h-screen flex flex-col">
            <Header />
            <main className="flex-1 container mx-auto px-4 py-6">{children}</main>
          </div>
        </QueryProvider>
      </body>
    </html>
  );
}
