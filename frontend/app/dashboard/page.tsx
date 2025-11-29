"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { toast } from 'react-hot-toast';

interface MarketMover {
  symbol: string;
  change_pct: number;
  price: number;
}

interface PortfolioStats {
  cash: number;
  holdings: any[];
  total_value?: number;
}

interface UserRank {
  rank: number;
  total_value: number;
}

export default function DashboardPage() {
  const [username, setUsername] = useState("Trader");
  const [movers, setMovers] = useState<{ top_gainers: MarketMover[], top_losers: MarketMover[] } | null>(null);
  const [portfolio, setPortfolio] = useState<PortfolioStats | null>(null);
  const [rank, setRank] = useState<UserRank | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get username from local storage or token if possible, or just wait for profile fetch
    // For now, let's try to fetch profile or just use "Trader"
    const fetchDashboardData = async () => {
      try {
        const token = localStorage.getItem("access");
        const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};

        // 1. Fetch Profile (for name)
        try {
            const profileRes = await axios.get("http://localhost:8000/api/auth/me/", config);
            setUsername(profileRes.data.user.username);
        } catch (e) {}

        // 2. Fetch Market Movers
        try {
            const moversRes = await axios.get("http://localhost:8000/api/market/movers/");
            if (moversRes.data.success) {
                setMovers(moversRes.data);
            }
        } catch (e) { console.error("Movers error", e); }

        // 3. Fetch Portfolio
        if (token) {
            try {
                const portRes = await axios.get("http://localhost:8000/api/simulation/portfolio/", config);
                if (portRes.data.success) {
                    setPortfolio(portRes.data);
                }
            } catch (e) { console.error("Portfolio error", e); }

            // 4. Fetch Rank
            try {
                const rankRes = await axios.get("http://localhost:8000/api/leaderboard/?metric=value", config);
                if (rankRes.data.user_entry) {
                    setRank(rankRes.data.user_entry);
                }
            } catch (e) { console.error("Rank error", e); }
        }

      } catch (error) {
        console.error("Dashboard load error", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // Calculate total portfolio value
  const totalPortfolioValue = portfolio 
    ? (portfolio.cash + (portfolio.holdings.reduce((acc, h) => acc + (h.value || 0), 0)))
    : 0;

  return (
    <div className="min-h-screen bg-background text-text-primary font-sans p-6">
      <div className="container mx-auto max-w-6xl">
        
        {/* Header */}
        <header className="mb-10">
          <h1 className="text-3xl font-bold mb-2">
            Welcome back, <span className="text-primary">{username}</span> 👋
          </h1>
          <p className="text-text-secondary">Here is your daily market and portfolio snapshot.</p>
        </header>

        {/* Quick Actions Grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          <Link href="/chat" className="group">
            <div className="bg-surface border border-border rounded-xl p-6 hover:bg-surface-hover transition-all hover:-translate-y-1 shadow-lg hover:shadow-primary/10 h-full flex flex-col">
              <div className="w-12 h-12 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">
                🤖
              </div>
              <h3 className="text-xl font-bold mb-2">AI Chat</h3>
              <p className="text-sm text-text-secondary">Ask questions, analyze stocks, and learn concepts.</p>
            </div>
          </Link>

          <Link href="/simulation" className="group">
            <div className="bg-surface border border-border rounded-xl p-6 hover:bg-surface-hover transition-all hover:-translate-y-1 shadow-lg hover:shadow-green-500/10 h-full flex flex-col">
              <div className="w-12 h-12 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">
                💸
              </div>
              <h3 className="text-xl font-bold mb-2">Simulation</h3>
              <p className="text-sm text-text-secondary">Practice trading with ₹10L virtual cash.</p>
            </div>
          </Link>

          <Link href="/playground" className="group">
            <div className="bg-surface border border-border rounded-xl p-6 hover:bg-surface-hover transition-all hover:-translate-y-1 shadow-lg hover:shadow-purple-500/10 h-full flex flex-col">
              <div className="w-12 h-12 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">
                🧪
              </div>
              <h3 className="text-xl font-bold mb-2">Playground</h3>
              <p className="text-sm text-text-secondary">Backtest strategies and visualize data.</p>
            </div>
          </Link>

          <Link href="/leaderboard" className="group">
            <div className="bg-surface border border-border rounded-xl p-6 hover:bg-surface-hover transition-all hover:-translate-y-1 shadow-lg hover:shadow-yellow-500/10 h-full flex flex-col">
              <div className="w-12 h-12 rounded-full bg-yellow-500/20 text-yellow-400 flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">
                🏆
              </div>
              <h3 className="text-xl font-bold mb-2">Leaderboard</h3>
              <p className="text-sm text-text-secondary">Compete with others and see your rank.</p>
            </div>
          </Link>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Market Pulse Widget */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-surface border border-border rounded-xl p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  📊 Market Pulse <span className="text-xs font-normal text-text-secondary bg-surface-hover px-2 py-1 rounded">NIFTY 50</span>
                </h2>
                <span className="text-xs text-text-secondary animate-pulse">● Live</span>
              </div>

              {loading ? (
                <div className="h-40 flex items-center justify-center text-text-secondary">Loading market data...</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Top Gainers */}
                  <div>
                    <h3 className="text-sm font-semibold text-green-400 mb-3 uppercase tracking-wider">Top Gainers</h3>
                    <div className="space-y-3">
                      {movers?.top_gainers?.slice(0, 5).map((stock) => (
                        <div key={stock.symbol} className="flex justify-between items-center bg-surface-hover/50 p-2 rounded hover:bg-surface-hover transition-colors">
                          <span className="font-bold">{stock.symbol}</span>
                          <div className="text-right">
                            <div className="text-green-400 font-mono">+{stock.change_pct.toFixed(2)}%</div>
                            <div className="text-xs text-text-secondary">₹{stock.price.toLocaleString()}</div>
                          </div>
                        </div>
                      )) || <div className="text-text-secondary text-sm">No data available</div>}
                    </div>
                  </div>

                  {/* Top Losers */}
                  <div>
                    <h3 className="text-sm font-semibold text-red-400 mb-3 uppercase tracking-wider">Top Losers</h3>
                    <div className="space-y-3">
                      {movers?.top_losers?.slice(0, 5).map((stock) => (
                        <div key={stock.symbol} className="flex justify-between items-center bg-surface-hover/50 p-2 rounded hover:bg-surface-hover transition-colors">
                          <span className="font-bold">{stock.symbol}</span>
                          <div className="text-right">
                            <div className="text-red-400 font-mono">{stock.change_pct.toFixed(2)}%</div>
                            <div className="text-xs text-text-secondary">₹{stock.price.toLocaleString()}</div>
                          </div>
                        </div>
                      )) || <div className="text-text-secondary text-sm">No data available</div>}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* My Stats Widget */}
          <div className="space-y-6">
            <div className="bg-surface border border-border rounded-xl p-6 h-full">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                👤 My Status
              </h2>

              {loading ? (
                 <div className="h-40 flex items-center justify-center text-text-secondary">Loading stats...</div>
              ) : (
                <div className="space-y-6">
                  {/* Rank Card */}
                  <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg p-5 border border-slate-700 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10 text-6xl">🏆</div>
                    <div className="text-sm text-slate-400 mb-1">Current Rank</div>
                    <div className="text-3xl font-bold text-white">
                      #{rank?.rank || '-'}
                    </div>
                    <div className="text-xs text-slate-500 mt-2">
                      Top {rank?.rank && rank.rank <= 10 ? '10' : '50'} Trader
                    </div>
                  </div>

                  {/* Portfolio Card */}
                  <div className="bg-gradient-to-br from-emerald-900/50 to-emerald-950/50 rounded-lg p-5 border border-emerald-800/50 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10 text-6xl">💰</div>
                    <div className="text-sm text-emerald-400 mb-1">Net Worth (Sim)</div>
                    <div className="text-3xl font-bold text-white">
                      ₹{totalPortfolioValue ? totalPortfolioValue.toLocaleString(undefined, { maximumFractionDigits: 0 }) : '10,00,000'}
                    </div>
                    <div className="text-xs text-emerald-500/70 mt-2">
                      Cash: ₹{portfolio?.cash?.toLocaleString(undefined, { maximumFractionDigits: 0 }) || '10,00,000'}
                    </div>
                  </div>

                  {/* Quick Tip */}
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                    <div className="flex gap-3">
                      <div className="text-2xl">💡</div>
                      <div>
                        <h4 className="font-bold text-blue-400 text-sm mb-1">Did you know?</h4>
                        <p className="text-xs text-text-secondary">
                          Diversifying your portfolio across sectors improves your "Balanced" score on the leaderboard.
                        </p>
                      </div>
                    </div>
                  </div>

                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
