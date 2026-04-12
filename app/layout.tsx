import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "X Bull Earnings Estimator",
  description: "Estimate how much your X account could earn in a bull market."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
