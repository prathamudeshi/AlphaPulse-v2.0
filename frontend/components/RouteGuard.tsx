"use client";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { isAuthenticated } from "../lib/auth";

const publicRoutes = ["/", "/login", "/register"];

export default function RouteGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const auth = isAuthenticated();
    const isPublicRoute = publicRoutes.includes(pathname);

    // Redirect logged-out users from protected routes to login
    if (!auth && !isPublicRoute) {
      router.push("/login");
      return;
    }

    // Redirect logged-in users from home page to chat
    if (auth && pathname === "/") {
      router.push("/chat");
      return;
    }
  }, [pathname, router]);

  return <>{children}</>;
}
