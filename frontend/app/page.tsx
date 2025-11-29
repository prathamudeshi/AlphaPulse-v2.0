"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { isAuthenticated } from "../lib/auth";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated()) {
      router.push("/dashboard");
    }
  }, [router]);

  return (
    <main className="flex h-full items-center justify-center">
      <div className="text-center space-y-6">
        <h1 className="text-3xl font-semibold">ChatGPT Clone</h1>
        <div className="space-x-4">
          <Link
            href="/login"
            className="rounded bg-emerald-600 px-4 py-2 hover:bg-emerald-500"
          >
            Login
          </Link>
          <Link
            href="/register"
            className="rounded bg-slate-700 px-4 py-2 hover:bg-slate-600"
          >
            Register
          </Link>
        </div>
      </div>
    </main>
  );
}
