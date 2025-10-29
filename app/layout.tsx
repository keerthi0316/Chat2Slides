// app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import dynamic from "next/dynamic";

const inter = Inter({ subsets: ["latin"] });

// Dynamically import client-only component
const NameInputModal = dynamic(() => import("@/components/NameInputModal"), {
  ssr: false,
});

export const metadata: Metadata = {
  title: "AI PPT Generator",
  description: "Create presentations with AI",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-50 text-gray-900`}>
        {children}
        <NameInputModal />
      </body>
    </html>
  );
}
