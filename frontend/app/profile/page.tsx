"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "../../lib/api";
import { logout, isAuthenticated } from "../../lib/auth";
import toast from "react-hot-toast";
import {
  ArrowLeft, LogOut, Save, Key, User, Mail, Phone,
  Shield, Activity, Eye, EyeOff, CheckCircle, XCircle,
  CreditCard, TrendingUp, Sparkles
} from "lucide-react";
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
  const [showSecret, setShowSecret] = useState(false);

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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
      <div className="flex h-screen items-center justify-center bg-background text-text-primary">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );

  const isKiteConnected = !!form.kiteconnect_access_token;

  return (
    <main className="min-h-screen bg-background text-text-primary pb-12">
      {/* Hero Header */}
      <div className="relative h-64 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600">
        <div className="absolute inset-0 bg-black/20" />
        <div className="absolute top-6 left-6">
          <Link
            href="/chat"
            className="flex items-center gap-2 px-4 py-2 bg-black/30 hover:bg-black/50 backdrop-blur-md rounded-full text-white transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Chat</span>
          </Link>
        </div>
        <div className="absolute top-6 right-6">
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/40 backdrop-blur-md border border-red-500/30 rounded-full text-white transition-all"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign out</span>
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 -mt-24 relative z-10">
        {/* Profile Card */}
        <div className="flex flex-col md:flex-row items-end gap-6 mb-8">
          <div className="w-32 h-32 rounded-full bg-surface border-4 border-background shadow-xl flex items-center justify-center text-4xl font-bold text-primary relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-purple-500/20 group-hover:scale-110 transition-transform duration-500" />
            {data?.username?.slice(0, 2).toUpperCase() || "US"}
          </div>
          <div className="flex-1 mb-2">
            <h1 className="text-4xl font-bold text-white mb-1 flex items-center gap-3">
              {data?.username || "Trader"}
              <span className="px-3 py-1 bg-yellow-500/20 border border-yellow-500/40 text-yellow-400 text-xs font-bold rounded-full uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Pro
              </span>
            </h1>
            <p className="text-white/80 flex items-center gap-2">
              <Mail className="w-4 h-4" /> {form.email || "No email set"}
            </p>
          </div>
          <div className="mb-2">
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="flex items-center gap-2 px-8 py-3 rounded-full bg-primary hover:bg-primary-hover text-background font-bold shadow-lg shadow-primary/25 transition-all disabled:opacity-50 hover:-translate-y-1"
            >
              <Save className="w-5 h-5" />
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Personal Info */}
          <div className="space-y-8">
            <section className="bg-surface/50 backdrop-blur-md border border-white/5 rounded-2xl p-6 shadow-xl">
              <h2 className="text-xl font-bold text-text-primary mb-6 flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                Personal Details
              </h2>
              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-medium text-text-secondary uppercase tracking-wider mb-2">
                    Username
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
                    <input
                      className="w-full rounded-xl bg-input/50 border border-border pl-10 pr-4 py-3 outline-none text-text-secondary cursor-not-allowed"
                      value={data?.username || ""}
                      disabled
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-secondary uppercase tracking-wider mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
                    <input
                      className="w-full rounded-xl bg-input border border-border pl-10 pr-4 py-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all"
                      name="email"
                      value={form.email}
                      onChange={handleChange}
                      type="email"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-secondary uppercase tracking-wider mb-2">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
                    <input
                      className="w-full rounded-xl bg-input border border-border pl-10 pr-4 py-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all"
                      name="phone_number"
                      value={form.phone_number}
                      onChange={handleChange}
                      type="tel"
                      placeholder="+91..."
                    />
                  </div>
                  <p className="text-xs text-text-secondary mt-2 flex items-center gap-1">
                    <Shield className="w-3 h-3" /> Required for WhatsApp alerts
                  </p>
                </div>
              </div>
            </section>

            <section className="bg-surface/50 backdrop-blur-md border border-white/5 rounded-2xl p-6 shadow-xl">
              <h2 className="text-xl font-bold text-text-primary mb-6 flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary" />
                Trading Persona
              </h2>
              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-medium text-text-secondary uppercase tracking-wider mb-2">
                    Bio & Strategy
                  </label>
                  <textarea
                    className="w-full rounded-xl bg-input border border-border p-4 outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all min-h-[120px] resize-none"
                    name="bio"
                    value={form.bio}
                    onChange={handleChange}
                    placeholder="Describe your trading style (e.g., 'I prefer low-risk, long-term investments...')"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-secondary uppercase tracking-wider mb-2">
                    Max Trade Value (₹)
                  </label>
                  <div className="relative">
                    <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
                    <input
                      className="w-full rounded-xl bg-input border border-border pl-10 pr-4 py-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all"
                      name="trade_threshold"
                      value={form.trade_threshold}
                      onChange={handleChange}
                      type="number"
                      placeholder="10000"
                    />
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* Right Column: API Config */}
          <div className="lg:col-span-2 space-y-8">
            <section className="bg-surface/50 backdrop-blur-md border border-white/5 rounded-2xl p-8 shadow-xl h-full">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
                  <Key className="w-5 h-5 text-primary" />
                  Broker Integration (Zerodha Kite)
                </h2>
                <div className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2 border ${isKiteConnected ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                  {isKiteConnected ? (
                    <>
                      <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                      Connected
                    </>
                  ) : (
                    <>
                      <div className="w-2 h-2 rounded-full bg-red-400" />
                      Disconnected
                    </>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6">
                <div>
                  <label className="block text-xs font-medium text-text-secondary uppercase tracking-wider mb-2">
                    API Key
                  </label>
                  <input
                    className="w-full rounded-xl bg-input border border-border px-4 py-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all font-mono text-sm"
                    name="kiteconnect_key"
                    value={form.kiteconnect_key}
                    onChange={handleChange}
                    type="text"
                    placeholder="Enter your Kite Connect API Key"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-text-secondary uppercase tracking-wider mb-2">
                    API Secret
                  </label>
                  <div className="relative">
                    <input
                      className="w-full rounded-xl bg-input border border-border pl-4 pr-12 py-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all font-mono text-sm"
                      name="kiteconnect_api_secret"
                      value={form.kiteconnect_api_secret}
                      onChange={handleChange}
                      type={showSecret ? "text" : "password"}
                      placeholder="Enter your Kite Connect API Secret"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSecret(!showSecret)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-text-secondary hover:text-primary transition-colors"
                    >
                      {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="pt-4 border-t border-border/50">
                  <label className="block text-xs font-medium text-text-secondary uppercase tracking-wider mb-4">
                    Access Token Status
                  </label>
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                      <div className={`absolute inset-y-0 left-0 w-1 rounded-l-xl ${isKiteConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                      <input
                        className="w-full rounded-xl bg-input/50 border border-border pl-4 pr-4 py-3 outline-none text-text-secondary font-mono text-xs"
                        value={form.kiteconnect_access_token ? "••••••••••••••••••••••••••••••••" : "No access token generated"}
                        disabled
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleGetAccessToken}
                      className="px-6 py-3 rounded-xl bg-surface hover:bg-surface-hover border border-border hover:border-primary/50 text-primary font-bold transition-all whitespace-nowrap flex items-center justify-center gap-2"
                    >
                      <TrendingUp className="w-4 h-4" />
                      Generate Token
                    </button>
                  </div>
                  <p className="text-xs text-text-secondary mt-3 leading-relaxed">
                    Clicking "Generate Token" will redirect you to Zerodha to authorize the application.
                    This token is valid for one day and is required to place trades.
                  </p>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
