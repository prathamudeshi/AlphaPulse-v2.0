"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "../../lib/api";
import { logout, isAuthenticated } from "../../lib/auth";
import toast from "react-hot-toast";
import { ArrowLeft, LogOut, Save, Key } from "lucide-react";
import Link from "next/link";

export default function ProfilePage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [form, setForm] = useState({
    email: "",
    bio: "",
    trade_threshold: "",
    kiteconnect_key: "",
    kiteconnect_api_secret: "",
    kiteconnect_access_token: "",
    phone_number: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login");
      return;
    }
  }, [router]);

  useEffect(() => {
    const url = new URL(window.location.href);
    const requestToken = url.searchParams.get("request_token");
    if (!requestToken) return;
    api
      .post("/kite/exchange_token/", { request_token: requestToken })
      .then((res) => {
        toast.success("Access token generated!");
        setForm((prev) => ({
          ...prev,
          kiteconnect_access_token: res.data?.access_token || "",
        }));
      })
      .catch(() => toast.error("Failed to generate access token"));
  }, []);

  useEffect(() => {
    api
      .get("/auth/profile/")
      .then((res) => {
        setData(res.data);
        setForm({
          email: res.data.email || "",
          bio: res.data.bio || "",
          trade_threshold: res.data.trade_threshold || "",
          kiteconnect_key: res.data.kiteconnect_key || "",
          kiteconnect_api_secret: res.data.kiteconnect_api_secret || "",
          kiteconnect_access_token: res.data.kiteconnect_access_token || "",
          phone_number: res.data.phone_number || "",
        });
      })
      .catch(() => {
        toast.error("Failed to load profile");
        router.push("/login");
      })
      .finally(() => setLoading(false));
  }, [router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleGetAccessToken = async () => {
    const api_key = form.kiteconnect_key;
    if (!api_key) {
      toast.error("Please enter your KiteConnect API key");
      return;
    }
    window.location.href = `https://kite.zerodha.com/connect/login?api_key=${api_key}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.put("/auth/profile/", form);
      setData(res.data);
      toast.success("Profile updated!");
    } catch {
      toast.error("Failed to update profile");
    }
    setSaving(false);
  };

  const handleLogout = () => {
    logout();
  };

  if (loading)
    return (
      <div className="flex h-full items-center justify-center bg-background text-text-primary">
        Loading...
      </div>
    );

  return (
    <main className="min-h-screen bg-background text-text-primary p-6">
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/chat"
              className="p-2 hover:bg-surface-hover rounded-full text-text-secondary transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <h1 className="text-3xl font-medium">Settings</h1>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-surface hover:bg-red-500/10 hover:text-red-400 text-text-secondary transition-colors border border-border"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign out</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* User Info Section */}
          <section className="space-y-4">
            <h2 className="text-xl font-medium text-text-primary">
              Account Information
            </h2>
            <div className="bg-surface rounded-2xl border border-border p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Username
                </label>
                <input
                  className="w-full rounded-lg bg-input px-4 py-3 outline-none ring-1 ring-border text-text-secondary cursor-not-allowed"
                  value={data?.username || ""}
                  disabled
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Email
                </label>
                <input
                  className="w-full rounded-lg bg-input px-4 py-3 outline-none ring-1 ring-border focus:ring-primary transition-all"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  type="email"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Phone Number (WhatsApp)
                </label>
                <input
                  className="w-full rounded-lg bg-input px-4 py-3 outline-none ring-1 ring-border focus:ring-primary transition-all"
                  name="phone_number"
                  value={form.phone_number}
                  onChange={handleChange}
                  type="tel"
                  placeholder="e.g. +919876543210"
                />
                <p className="text-xs text-text-secondary mt-1">
                  Required for WhatsApp integration. Include country code.
                </p>
              </div>
            </div>
          </section>

          {/* Trading Preferences Section */}
          <section className="space-y-4">
            <h2 className="text-xl font-medium text-text-primary">
              Trading Preferences
            </h2>
            <div className="bg-surface rounded-2xl border border-border p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Tell us more about yourself (Bio)
                </label>
                <textarea
                  className="w-full rounded-lg bg-input px-4 py-3 outline-none ring-1 ring-border focus:ring-primary transition-all min-h-[100px]"
                  name="bio"
                  value={form.bio}
                  onChange={(e) => setForm({ ...form, bio: e.target.value })}
                  placeholder="e.g. I am a conservative trader who prefers low-risk stocks..."
                />
                <p className="text-xs text-text-secondary mt-1">
                  This helps the AI adapt its persona and recommendations to your style.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Trade Threshold (Max Order Value)
                </label>
                <input
                  className="w-full rounded-lg bg-input px-4 py-3 outline-none ring-1 ring-border focus:ring-primary transition-all"
                  name="trade_threshold"
                  value={form.trade_threshold}
                  onChange={handleChange}
                  type="number"
                  placeholder="e.g. 10000"
                />
                <p className="text-xs text-text-secondary mt-1">
                  The AI will reject any single order estimated to exceed this value.
                </p>
              </div>
            </div>
          </section>

          {/* API Keys Section */}
          <section className="space-y-4">
            <h2 className="text-xl font-medium text-text-primary flex items-center gap-2">
              <Key className="w-5 h-5 text-primary" />
              API Configuration
            </h2>
            <div className="bg-surface rounded-2xl border border-border p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  KiteConnect API Key
                </label>
                <input
                  className="w-full rounded-lg bg-input px-4 py-3 outline-none ring-1 ring-border focus:ring-primary transition-all font-mono text-sm"
                  name="kiteconnect_key"
                  value={form.kiteconnect_key}
                  onChange={handleChange}
                  type="text"
                  autoComplete="off"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  KiteConnect API Secret
                </label>
                <input
                  className="w-full rounded-lg bg-input px-4 py-3 outline-none ring-1 ring-border focus:ring-primary transition-all font-mono text-sm"
                  name="kiteconnect_api_secret"
                  value={form.kiteconnect_api_secret}
                  onChange={handleChange}
                  type="password"
                  autoComplete="off"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  KiteConnect Access Token
                </label>
                <div className="flex gap-2">
                  <input
                    className="flex-1 rounded-lg bg-input px-4 py-3 outline-none ring-1 ring-border focus:ring-primary transition-all font-mono text-sm"
                    name="kiteconnect_access_token"
                    value={form.kiteconnect_access_token}
                    onChange={handleChange}
                    type="text"
                    autoComplete="off"
                  />
                  <button
                    type="button"
                    className="px-4 rounded-lg bg-surface hover:bg-surface-hover border border-border text-primary font-medium transition-colors whitespace-nowrap"
                    onClick={handleGetAccessToken}
                  >
                    Get Token
                  </button>
                </div>
              </div>
            </div>
          </section>

          <div className="flex justify-end pt-4">
            <button
              className="flex items-center gap-2 px-8 py-3 rounded-full bg-primary hover:bg-primary-hover text-background font-medium transition-colors disabled:opacity-50"
              type="submit"
              disabled={saving}
            >
              <Save className="w-5 h-5" />
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
