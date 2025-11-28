"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Chat from "components/Chat";
import { isAuthenticated } from "../../lib/auth";

export default function SimulationPage() {
  const router = useRouter();
  const [isAuth, setIsAuth] = useState(false);

  useEffect(() => {
    const auth = isAuthenticated();
    if (!auth) {
      router.push("/login");
    } else {
      setIsAuth(true);
    }
  }, [router]);

  if (!isAuth) {
    return <div className="p-6">Redirecting to login...</div>;
  }

  return <Chat mode="simulation" />;
}
