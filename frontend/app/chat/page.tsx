"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Chat from "components/Chat";
import { isAuthenticated } from "../../lib/auth";

export default function ChatPage() {
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login");
    }
  }, [router]);

  if (!isAuthenticated()) {
    return <div className="p-6">Redirecting to login...</div>;
  }

  return <Chat />;
}
