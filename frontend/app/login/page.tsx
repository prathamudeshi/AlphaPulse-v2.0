"use client";
import { useState, useEffect } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { isAuthenticated } from "../../lib/auth";
import { motion } from "framer-motion";
import { User, Lock, ArrowRight, Sparkles } from "lucide-react";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000/api";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated()) {
      router.push("/chat");
    }
  }, [router]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
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
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen w-full flex items-center justify-center p-6 relative overflow-hidden bg-gray-950">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-purple-950/20 to-gray-900 z-0" />
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] animate-pulse delay-1000" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-purple-600 mb-6 shadow-lg shadow-primary/25"
          >
            <Sparkles className="w-8 h-8 text-white" />
          </motion.div>
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
            Welcome Back
          </h1>
          <p className="text-text-secondary">Sign in to continue your journey</p>
        </div>

        <div className="bg-surface/50 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl">
          <form onSubmit={onSubmit} className="space-y-6">
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center"
              >
                {error}
              </motion.div>
            )}

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-text-secondary ml-1">Username</label>
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary group-focus-within:text-primary transition-colors" />
                  <input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-black/20 border border-white/10 rounded-xl px-12 py-3.5 outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all placeholder:text-text-secondary/50 text-text-primary"
                    placeholder="Enter your username"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-text-secondary ml-1">Password</label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary group-focus-within:text-primary transition-colors" />
                  <input
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    type="password"
                    className="w-full bg-black/20 border border-white/10 rounded-xl px-12 py-3.5 outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all placeholder:text-text-secondary/50 text-text-primary"
                    placeholder="Enter your password"
                  />
                </div>
              </div>
            </div>

            <button
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-primary to-purple-600 hover:from-primary-hover hover:to-purple-500 text-white font-medium py-3.5 rounded-xl transition-all shadow-lg shadow-primary/25 hover:shadow-primary/40 active:scale-[0.98] flex items-center justify-center gap-2 group disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? "Signing in..." : "Sign In"}
              {!isLoading && <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
            </button>

            <div className="text-center text-sm text-text-secondary">
              Don't have an account?{" "}
              <Link
                href="/register"
                className="text-primary hover:text-primary-hover font-medium hover:underline underline-offset-4 transition-all"
              >
                Create account
              </Link>
            </div>
          </form>
        </div>
      </motion.div>
    </main>
  );
}
