import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ConvexProviderWrapper from "@/providers/convex-provider";
import { SessionProvider } from "@/providers/session-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  ...(process.env.NODE_ENV === "development"
    ? {
        title: "Spotify Controller - Development Mode",
        description:
          "The website is running in development mode, some features may not work as expected, and expected features may not be available or getting errors and unstable.",
      }
    : {
        title: "Spotify Controller",
        description: "a request a hehe :D",
      }),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-w-[374px] bg-black`}
      >
        <SessionProvider>
          <ConvexProviderWrapper>{children}</ConvexProviderWrapper>
        </SessionProvider>
      </body>
    </html>
  );
}
