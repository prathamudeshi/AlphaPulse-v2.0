"use client";
import Link from "next/link";
import { ArrowLeft, ExternalLink, Key, MessageSquare, PieChart, ShieldCheck } from "lucide-react";

export default function TutorialPage() {
  return (
    <main className="min-h-screen bg-background text-text-primary p-6 md:p-12">
      <div className="max-w-4xl mx-auto space-y-12">
        {/* Header */}
        <div className="space-y-4">
          <Link
            href="/chat"
            className="inline-flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Chat
          </Link>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Getting Started Guide
          </h1>
          <p className="text-xl text-text-secondary">
            Learn how to connect your Kite account and master the trading assistant.
          </p>
        </div>

        {/* Step 1: Kite Connect Setup */}
        <section className="space-y-6">
          <div className="flex items-center gap-3 text-2xl font-semibold text-text-primary">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-sm">
              1
            </div>
            <h2>Connect Your Kite Account</h2>
          </div>
          
          <div className="bg-surface rounded-2xl border border-border p-6 space-y-6">
            <div className="space-y-4">
              <p className="text-text-secondary leading-relaxed">
                To enable trading features, you need to connect your Zerodha Kite account. This requires a Kite Connect API account.
              </p>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-medium text-text-primary flex items-center gap-2">
                    <ExternalLink className="w-4 h-4 text-primary" />
                    Prerequisites
                  </h3>
                  <ul className="list-disc list-inside space-y-2 text-sm text-text-secondary ml-2">
                    <li>Active Zerodha Trading Account</li>
                    <li>Kite Connect Developer Account</li>
                    <li>2000 credits for Kite Connect API</li>
                  </ul>
                  <a 
                    href="https://developers.kite.trade/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-block text-primary hover:underline text-sm"
                  >
                    Visit Kite Developers Console →
                  </a>
                </div>
                
                <div className="space-y-4">
                  <h3 className="font-medium text-text-primary flex items-center gap-2">
                    <Key className="w-4 h-4 text-primary" />
                    Get Credentials
                  </h3>
                  <ol className="list-decimal list-inside space-y-2 text-sm text-text-secondary ml-2">
                    <li>Create a new app in Kite Console</li>
                    <li>Copy the <strong>API Key</strong></li>
                    <li>Copy the <strong>API Secret</strong></li>
                    <li>Set redirect URL to your app URL</li>
                  </ol>
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-border">
              <h3 className="font-medium text-text-primary">Configure in App</h3>
              <p className="text-sm text-text-secondary">
                Go to <strong>Profile & Settings</strong> and enter your API credentials.
              </p>
              <div className="rounded-xl overflow-hidden border border-border shadow-lg">
                <img 
                  src="/tutorial/profile-settings.png" 
                  alt="Profile Settings" 
                  className="w-full h-auto object-cover"
                />
              </div>
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 text-sm text-blue-200">
                <strong>Tip:</strong> After saving your keys, click the "Get Token" button to generate a daily access token. You'll need to do this once every day before trading.
              </div>
            </div>
          </div>
        </section>

        {/* Step 2: Using the Chat */}
        <section className="space-y-6">
          <div className="flex items-center gap-3 text-2xl font-semibold text-text-primary">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-sm">
              2
            </div>
            <h2>Chat & Analysis</h2>
          </div>

          <div className="bg-surface rounded-2xl border border-border p-6 space-y-6">
            <p className="text-text-secondary">
              The chat interface is your command center. You can ask for stock information, market trends, or place orders using natural language.
            </p>
            
            <div className="rounded-xl overflow-hidden border border-border shadow-lg">
              <img 
                src="/tutorial/chat-interface.png" 
                alt="Chat Interface" 
                className="w-full h-auto object-cover"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-surface-hover/50 p-4 rounded-xl">
                <div className="flex items-center gap-2 mb-2 text-primary">
                  <MessageSquare className="w-4 h-4" />
                  <span className="font-medium">Try asking...</span>
                </div>
                <ul className="space-y-2 text-sm text-text-secondary">
                  <li>"What is the price of Reliance?"</li>
                  <li>"Show me the top gainers today"</li>
                  <li>"Analyze Tata Motors stock"</li>
                </ul>
              </div>
              <div className="bg-surface-hover/50 p-4 rounded-xl">
                <div className="flex items-center gap-2 mb-2 text-green-400">
                  <ShieldCheck className="w-4 h-4" />
                  <span className="font-medium">Safety First</span>
                </div>
                <p className="text-sm text-text-secondary">
                  The AI checks your orders against safety guardrails. You can set a <strong>Max Order Value</strong> in your profile to prevent accidental large orders.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Step 3: Portfolio Management */}
        <section className="space-y-6">
          <div className="flex items-center gap-3 text-2xl font-semibold text-text-primary">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-sm">
              3
            </div>
            <h2>Portfolio Tracking</h2>
          </div>

          <div className="bg-surface rounded-2xl border border-border p-6 space-y-6">
            <p className="text-text-secondary">
              View your holdings and track performance in real-time. Just ask "Show my holdings" or "Get portfolio".
            </p>
            
            <div className="rounded-xl overflow-hidden border border-border shadow-lg">
              <img 
                src="/tutorial/holdings-view.png" 
                alt="Holdings View" 
                className="w-full h-auto object-cover"
              />
            </div>

            <div className="flex items-start gap-3 p-4 bg-surface-hover/30 rounded-xl">
              <PieChart className="w-5 h-5 text-primary mt-1" />
              <div>
                <h4 className="font-medium text-text-primary">Visual Breakdown</h4>
                <p className="text-sm text-text-secondary mt-1">
                  The sidebar provides a visual breakdown of your asset allocation and detailed P&L for each stock.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="space-y-6 pt-8 border-t border-border">
          <h2 className="text-2xl font-semibold text-text-primary">Frequently Asked Questions</h2>
          <div className="grid gap-4">
            {[
              {
                q: "Is my API key safe?",
                a: "Yes, your API keys are encrypted before being stored in our database. We never share them with third parties."
              },
              {
                q: "Do I need to login to Kite every day?",
                a: "Yes, Kite Connect requires a fresh access token every day. Use the 'Get Token' button in your profile each morning."
              },
              {
                q: "Can the AI place orders automatically?",
                a: "No, the AI will always ask for your confirmation before placing any order. It prepares the order for you to review."
              }
            ].map((faq, i) => (
              <div key={i} className="bg-surface p-4 rounded-xl border border-border">
                <h3 className="font-medium text-text-primary mb-2">{faq.q}</h3>
                <p className="text-sm text-text-secondary">{faq.a}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="flex justify-center pt-8 pb-12">
          <Link
            href="/chat"
            className="px-8 py-3 bg-primary hover:bg-primary-hover text-background font-medium rounded-full transition-colors text-lg"
          >
            Start Trading Now
          </Link>
        </div>
      </div>
    </main>
  );
}
