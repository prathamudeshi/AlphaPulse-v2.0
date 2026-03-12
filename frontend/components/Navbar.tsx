"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { isAuthenticated, logout } from "../lib/auth";

import {
  User, LayoutDashboard, MessageSquare, Gamepad2,
  FlaskConical, Trophy, Target, HelpCircle
} from "lucide-react";

const authenticatedNavLinks = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/chat", label: "Chat", icon: MessageSquare },
  { href: "/simulation", label: "Simulation", icon: Gamepad2 },
  { href: "/playground", label: "Playground", icon: FlaskConical },
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { href: "/goals", label: "Goals", icon: Target },
  { href: "/tutorial", label: "Help", icon: HelpCircle },
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
        <Link href={authenticated ? "/dashboard" : "/"}>
          <span className="text-xl font-medium text-text-primary">
            AlphaPulse
          </span>
        </Link>
        <div className="flex gap-1">
          {navLinks.map((link) => {
            const Icon = (link as any).icon;
            const isActive = pathname === link.href;

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors duration-150 flex items-center gap-2 ${isActive
                  ? "bg-primary/10 text-primary shadow-[0_0_10px_rgba(var(--primary-rgb),0.2)]"
                  : "text-text-secondary hover:bg-surface-hover hover:text-text-primary"
                  }`}
              >
                {Icon && <Icon className="w-4 h-4" />}
                {link.label}
              </Link>
            );
          })}
        </div>
      </div>
      {authenticated && (
        <div className="flex items-center gap-3">
          <Link
            href="/profile"
            className={`p-2 rounded-full transition-colors ${pathname === '/profile'
              ? "bg-surface text-primary"
              : "text-text-secondary hover:bg-surface hover:text-text-primary"
              }`}
          >
            <User className="w-5 h-5" />
          </Link>
          <button
            onClick={handleLogout}
            className="px-4 py-2 rounded-full text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors"
          >
            Logout
          </button>
        </div>
      )}
    </nav>
  );
}
