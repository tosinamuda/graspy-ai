import type { Metadata } from "next";
import { Nunito, Geist_Mono } from "next/font/google";
import "./globals.css";
import "katex/dist/katex.min.css";
import { I18nProvider } from "@/lib/i18n-context";
import { headers } from "next/headers";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "graspy - AI Tutor for Out-of-School Children",
  description: "Personalized, culturally-aware education for children in crisis zones",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Read locale from middleware-set header
  const headersList = await headers();
  const locale = headersList.get('x-locale') || 'en';

  // Determine RTL based on locale
  const RTL_LANGUAGES = ['ar', 'he', 'fa', 'ur', 'ps', 'ku'];
  const dir = RTL_LANGUAGES.includes(locale) ? 'rtl' : 'ltr';

  return (
    <html lang={locale} dir={dir}>
      <body
        className={`${nunito.variable} ${geistMono.variable} antialiased`}
      >
        <I18nProvider>
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
