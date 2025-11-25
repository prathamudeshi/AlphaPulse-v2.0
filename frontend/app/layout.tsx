import "./globals.css";
import type { ReactNode } from "react";
import { Toaster } from "react-hot-toast";
import Navbar from "../components/Navbar";
import RouteGuard from "../components/RouteGuard";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full overflow-hidden bg-gray-950 text-gray-100 flex flex-col">
        <RouteGuard>
          <Navbar />
          <div className="flex-1 overflow-auto">{children}</div>
          <Toaster position="top-right" />
        </RouteGuard>
      </body>
    </html>
  );
}
