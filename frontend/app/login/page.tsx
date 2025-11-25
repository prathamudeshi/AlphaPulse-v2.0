"use client";
import { useState, useEffect } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { isAuthenticated } from "../../lib/auth";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000/api";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated()) {
      router.push("/chat");
    }
  }, [router]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await axios.post(`${API_BASE}/auth/login/`, {
        username,
        password,
      });
      localStorage.setItem("access", res.data.access);
      localStorage.setItem("refresh", res.data.refresh);
      router.push("/chat");
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Login failed");
    }
  };

  return (
    <main className="flex h-full items-center justify-center p-6 bg-background text-text-primary">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-medium mb-2">Welcome back</h1>
          <p className="text-text-secondary">Sign in to continue to Gemini</p>
        </div>

        <form
          onSubmit={onSubmit}
          className="bg-surface p-8 rounded-2xl border border-border space-y-6"
        >
          {error && (
            <div className="p-3 rounded bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
              {error}
            </div>
          )}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Username
              </label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-lg bg-input px-4 py-3 outline-none ring-1 ring-border focus:ring-primary transition-all"
                placeholder="Enter your username"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Password
              </label>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                className="w-full rounded-lg bg-input px-4 py-3 outline-none ring-1 ring-border focus:ring-primary transition-all"
                placeholder="Enter your password"
              />
            </div>
          </div>

          <button className="w-full rounded-full bg-primary py-3 text-background font-medium hover:bg-primary-hover transition-colors">
            Sign In
          </button>

          <div className="text-center text-sm text-text-secondary">
            Don't have an account?{" "}
            <Link
              href="/register"
              className="text-primary hover:text-primary-hover font-medium"
            >
              Create account
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}
