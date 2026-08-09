import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const origin = `${protocol}://${host}`;
  const title = "ElbeFlow — Hamburg Urban Mobility Lakehouse";
  const description = "84.000+ offizielle Hamburger Mobilitätsströme, 450 Mio.+ geplante Datensätze und ein reproduzierbares Multi-Source-Lakehouse.";
  return {
    metadataBase: new URL(origin),
    title,
    description,
    icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
    openGraph: {
      title,
      description,
      type: "website",
      url: origin,
      images: [{ url: `${origin}/og-multimodal.png`, width: 1734, height: 907, alt: "ElbeFlow multi-source Hamburg mobility network" }],
    },
    twitter: { card: "summary_large_image", title, description, images: [`${origin}/og-multimodal.png`] },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" dir="ltr">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        {children}
      </body>
    </html>
  );
}
