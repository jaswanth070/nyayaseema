import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { CaseProvider } from "@/lib/case";
import { Footer, Header } from "@/components/Chrome";

export const metadata: Metadata = {
  title: "NyayaSeema – Customs Shield Pass",
  description: "Shop globally. Clear locally. Travel stress-free. Pre-purchase customs intelligence and legal assistance.",
};

export const viewport: Viewport = { themeColor: "#12152b", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <CaseProvider>
          <div className="stripe" />
          <Header />
          <main>{children}</main>
          <Footer />
        </CaseProvider>
      </body>
    </html>
  );
}
