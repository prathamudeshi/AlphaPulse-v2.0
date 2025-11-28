"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { isAuthenticated, logout } from "../lib/auth";

const authenticatedNavLinks = [
  { href: "/chat", label: "Chat" },
  { href: "/simulation", label: "Simulation" },
  { href: "/profile", label: "Profile" },
  { href: "/tutorial", label: "Help" },
];

const unauthenticatedNavLinks = [
  { href: "/login", label: "Login" },
  { href: "/register", label: "Register" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    setAuthenticated(isAuthenticated());
  }, [pathname]);



  const navLinks = authenticated
    ? authenticatedNavLinks
    : unauthenticatedNavLinks;

  const handleLogout = () => {
    logout();
  };

  return (
    <nav className="w-full bg-background border-b border-border px-6 py-4 flex items-center justify-between sticky top-0 z-50">
      <div className="flex items-center gap-8">
        <Link href={authenticated ? "/chat" : "/"}>
          <span className="text-xl font-medium text-text-primary">
            AI Trading Bot
          </span>
        </Link>
        <div className="flex gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                pathname === link.href
                  ? "bg-surface text-text-primary"
                  : "text-text-secondary hover:bg-surface-hover hover:text-text-primary"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
      {authenticated && (
        <button
          onClick={handleLogout}
          className="px-4 py-2 rounded-full text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors"
        >
          Logout
        </button>
      )}
    </nav>
  );
}
