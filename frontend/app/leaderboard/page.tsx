"use client";

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';

interface LeaderboardEntry {
  rank: number;
  username: string;
  total_value: number;
  diversification_score: number;
  win_rate: number;
  is_current_user: boolean;
}

export default function LeaderboardPage() {
  const [metric, setMetric] = useState<'value' | 'balanced' | 'consistency'>('value');
  const [data, setData] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [userEntry, setUserEntry] = useState<LeaderboardEntry | null>(null);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("access");
      const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
      const response = await axios.get(`http://localhost:8000/api/leaderboard/?metric=${metric}`, config);
      setData(response.data.leaderboard);
      setUserEntry(response.data.user_entry);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load leaderboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, [metric]);

  const getMetricLabel = () => {
    switch (metric) {
      case 'value': return 'Most Valued (₹)';
      case 'balanced': return 'Diversification Score (0-100)';
      case 'consistency': return 'Win Rate (%)';
    }
  };

  const formatValue = (entry: LeaderboardEntry) => {
    switch (metric) {
      case 'value': return `₹${Number(entry.total_value).toLocaleString()}`;
      case 'balanced': return entry.diversification_score.toFixed(1);
      case 'consistency': return `${entry.win_rate.toFixed(1)}%`;
    }
  };

  return (
    <div className="min-h-screen bg-background text-text-primary font-sans p-6">
      <div className="container mx-auto max-w-4xl">
        <header className="mb-8 text-center">
          <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 to-orange-500 mb-2">
            AlphaPulse Leaderboard
          </h1>
          <p className="text-text-secondary">
            Compete with top traders in the simulation arena.
          </p>
        </header>

        {/* Metric Selector */}
        <div className="flex justify-center gap-4 mb-8">
          <button
            onClick={() => setMetric('value')}
            className={`px-6 py-2 rounded-full font-semibold transition-all ${
              metric === 'value' 
                ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/20' 
                : 'bg-surface hover:bg-surface-hover text-text-secondary'
            }`}
          >
            💰 Most Valued
          </button>
          <button
            onClick={() => setMetric('balanced')}
            className={`px-6 py-2 rounded-full font-semibold transition-all ${
              metric === 'balanced' 
                ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' 
                : 'bg-surface hover:bg-surface-hover text-text-secondary'
            }`}
          >
            ⚖️ Most Balanced
          </button>
          <button
            onClick={() => setMetric('consistency')}
            className={`px-6 py-2 rounded-full font-semibold transition-all ${
              metric === 'consistency' 
                ? 'bg-green-500 text-white shadow-lg shadow-green-500/20' 
                : 'bg-surface hover:bg-surface-hover text-text-secondary'
            }`}
          >
            🎯 Consistency
          </button>
        </div>

        {/* Podium (Top 3) */}
        {!loading && data.length >= 3 && (
          <div className="flex justify-center items-end gap-4 mb-12 h-64">
            {/* 2nd Place */}
            <div className="flex flex-col items-center w-1/3 max-w-[150px]">
              <div className="text-center mb-2">
                <div className="font-bold text-lg truncate w-full">{data[1].username}</div>
                <div className="text-sm text-text-secondary">{formatValue(data[1])}</div>
              </div>
              <div className="w-full h-32 bg-slate-700 rounded-t-lg flex items-center justify-center text-4xl font-bold text-slate-500 border-t-4 border-slate-400 relative">
                2
                <div className="absolute -top-3 w-8 h-8 rounded-full bg-slate-400 flex items-center justify-center text-xs text-black font-bold">🥈</div>
              </div>
            </div>

            {/* 1st Place */}
            <div className="flex flex-col items-center w-1/3 max-w-[150px]">
              <div className="text-center mb-2">
                <div className="font-bold text-xl text-yellow-400 truncate w-full">{data[0].username}</div>
                <div className="text-sm text-text-secondary">{formatValue(data[0])}</div>
              </div>
              <div className="w-full h-48 bg-yellow-600/20 rounded-t-lg flex items-center justify-center text-5xl font-bold text-yellow-500 border-t-4 border-yellow-400 relative shadow-[0_0_30px_rgba(250,204,21,0.2)]">
                1
                <div className="absolute -top-4 w-10 h-10 rounded-full bg-yellow-400 flex items-center justify-center text-sm text-black font-bold animate-bounce">👑</div>
              </div>
            </div>

            {/* 3rd Place */}
            <div className="flex flex-col items-center w-1/3 max-w-[150px]">
              <div className="text-center mb-2">
                <div className="font-bold text-lg truncate w-full">{data[2].username}</div>
                <div className="text-sm text-text-secondary">{formatValue(data[2])}</div>
              </div>
              <div className="w-full h-24 bg-orange-800/40 rounded-t-lg flex items-center justify-center text-4xl font-bold text-orange-600 border-t-4 border-orange-600 relative">
                3
                <div className="absolute -top-3 w-8 h-8 rounded-full bg-orange-600 flex items-center justify-center text-xs text-black font-bold">🥉</div>
              </div>
            </div>
          </div>
        )}

        {/* List */}
        <div className="bg-surface rounded-xl border border-border overflow-hidden">
          <div className="grid grid-cols-12 gap-4 p-4 border-b border-border bg-surface-hover text-sm font-semibold text-text-secondary uppercase tracking-wider">
            <div className="col-span-2 text-center">Rank</div>
            <div className="col-span-6">Trader</div>
            <div className="col-span-4 text-right">{getMetricLabel()}</div>
          </div>
          
          {loading ? (
            <div className="p-8 text-center text-text-secondary">Loading leaderboard...</div>
          ) : (
            <div className="divide-y divide-border">
              {/* Current User Sticky Row */}
              {userEntry && (
                <div className="grid grid-cols-12 gap-4 p-4 items-center bg-primary/20 border-b-4 border-primary/50 sticky top-0 z-10 shadow-lg">
                  <div className="col-span-2 text-center font-mono font-bold text-primary text-lg">
                    #{userEntry.rank}
                  </div>
                  <div className="col-span-6 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold bg-primary text-black">
                      {userEntry.username.substring(0, 2).toUpperCase()}
                    </div>
                    <span className="text-primary font-bold text-lg">
                      {userEntry.username} (You)
                    </span>
                  </div>
                  <div className="col-span-4 text-right font-mono font-bold text-primary text-lg">
                    {formatValue(userEntry)}
                  </div>
                </div>
              )}

              {data.map((entry) => (
                <div 
                  key={entry.username}
                  className={`grid grid-cols-12 gap-4 p-4 items-center hover:bg-surface-hover transition-colors ${
                    entry.is_current_user ? 'bg-primary/5' : ''
                  }`}
                >
                  <div className="col-span-2 text-center font-mono font-bold text-text-secondary">
                    #{entry.rank}
                  </div>
                  <div className="col-span-6 flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                      entry.is_current_user ? 'bg-primary text-black' : 'bg-slate-700 text-slate-300'
                    }`}>
                      {entry.username.substring(0, 2).toUpperCase()}
                    </div>
                    <span className={entry.is_current_user ? 'text-primary font-bold' : 'text-text-primary'}>
                      {entry.username} {entry.is_current_user && '(You)'}
                    </span>
                  </div>
                  <div className="col-span-4 text-right font-mono font-medium">
                    {formatValue(entry)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
