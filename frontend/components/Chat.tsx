"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import {
  Plus,
  Trash2,
  Check,
  X,
  MessageSquare,
  MoreVertical,
  SendHorizontal,
  Menu,
  Mic,
  Image as ImageIcon,
  Compass,
  Code,
  Lightbulb,
  Settings,
  TrendingUp,
  TrendingDown,

  PieChart as PieChartIcon,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  Activity,
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, AreaChart, Area } from "recharts";

type Message = {
  role: "user" | "assistant";
  content: string;
  created_at?: string;
};
type Conversation = { id: string; title: string; messages: Message[] };

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000/api";

export default function Chat({ mode = "real" }: { mode?: "real" | "simulation" }) {
  const [token, setToken] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  
  // Sidebar State
  const [sidebarData, setSidebarData] = useState<any>(null);
  const [sidebarMode, setSidebarMode] = useState<'holdings' | 'single' | 'list' | 'movers' | null>(null);
  const [showSidebar, setShowSidebar] = useState(false);
  
  // Chart State
  const [chartPeriod, setChartPeriod] = useState("1d");
  const [chartData, setChartData] = useState<any[]>([]);
  const [loadingChart, setLoadingChart] = useState(false);

  useEffect(() => {
    const t = localStorage.getItem("access");
    if (t) setToken(t);
  }, []);

  useEffect(() => {
    if (!token) return;
    axios
      .get(`${API_BASE}/conversations/`, {
        params: { mode },
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        setConversations(res.data);
        // Don't auto-select activeId to show welcome screen initially if desired,
        // or select the first one. Let's select first one for now.
        if (res.data.length && !activeId) setActiveId(res.data[0].id);
      })
      .catch(() => {});
  }, [token, mode]);

  const active = useMemo(
    () => conversations.find((c) => c.id === activeId) || null,
    [conversations, activeId]
  );

  const createConversation = async () => {
    if (!token) return;
    const res = await axios.post(
      `${API_BASE}/conversations/create/`,
      { title: "New chat", mode },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const convo = res.data as Conversation;
    setConversations([convo, ...conversations]);
    setActiveId(convo.id);
  };

  const sendMessage = async () => {
    if (!token || !input.trim()) return;
    
    let currentId = activeId;
    if (!currentId) {
        try {
            const res = await axios.post(
                `${API_BASE}/conversations/create/`,
                { title: "New chat", mode },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            const convo = res.data as Conversation;
            setConversations([convo, ...conversations]);
            setActiveId(convo.id);
            currentId = convo.id;
        } catch (e) {
            toast.error("Failed to start conversation");
            return;
        }
    }

    const userText = input;
    setInput("");

    const optimistic: Conversation[] = conversations.map((c) =>
      c.id === currentId
        ? {
            ...c,
            messages: [
              ...c.messages,
              { role: "user", content: userText },
              { role: "assistant", content: "" },
            ],
          }
        : c
    );
    // If we just created it, we need to add it to optimistic update properly
    if (!activeId) {
         // It's already added in setConversations above, but we need to update it with the message
         setConversations(prev => prev.map(c => c.id === currentId ? {
             ...c,
             messages: [
                 ...c.messages,
                 { role: "user", content: userText },
                 { role: "assistant", content: "" }
             ]
         } : c));
    } else {
        setConversations(optimistic);
    }

    try {
      const url = `${API_BASE}/conversations/${currentId}/stream/`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: userText }),
      });

      if (!res.body) return;
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let done = false;

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        if (readerDone) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split(/\n\n/).filter(Boolean);
        for (const line of lines) {
          if (!line.startsWith("data:")) continue;
          const data = line.replace(/^data:\s?/, "");
          if (data === "[DONE]") {
            done = true;
            break;
          }
          
          // Check for special holdings data event
          if (data.startsWith("[HOLDINGS]")) {
            try {
                const jsonStr = data.replace("[HOLDINGS]", "").trim();
                const holdings = JSON.parse(jsonStr);
                setSidebarData(holdings);
                setSidebarMode('holdings');
                setShowSidebar(true);
            } catch (e) {
                console.error("Failed to parse holdings data", e);
            }
            continue;
          }

          // Check for special stocks data event
          if (data.startsWith("[STOCKS]")) {
            try {
                const jsonStr = data.replace("[STOCKS]", "").trim();
                const payload = JSON.parse(jsonStr);
                setSidebarData(payload.data);
                setSidebarMode(payload.type); // 'single', 'list', 'movers'
                setShowSidebar(true);
                
                // Initialize chart data if single stock
                if (payload.type === 'single' && payload.data.history_1d) {
                    setChartData(payload.data.history_1d);
                    setChartPeriod("1d");
                }
            } catch (e) {
                console.error("Failed to parse stocks data", e);
            }
            continue;
          }

          setConversations((prev) =>
            prev.map((c) => {
              if (c.id !== activeId) return c;
              const msgs = [...c.messages];
              const last = msgs[msgs.length - 1];
              if (last && last.role === "assistant") {
                last.content += data;
              }
              return { ...c, messages: msgs };
            })
          );
        }
      }

      const updated = await axios.get(
        `${API_BASE}/conversations/${activeId}/`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setConversations((prev) =>
        prev.map((c) => (c.id === activeId ? updated.data : c))
      );
    } catch (e) {
      toast.error("Failed to send message");
    } finally {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  };

  const deleteConversation = async (id: string) => {
    if (!token) return;
    await axios.delete(`${API_BASE}/conversations/${id}/delete/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (activeId === id)
      setActiveId(conversations.find((c) => c.id !== id)?.id || null);
  };

  const startEditing = (id: string, currentTitle: string) => {
    setEditingId(id);
    setEditingTitle(currentTitle);
    setMenuOpenId(null);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingTitle("");
  };

  const updateConversationTitle = async (id: string) => {
    if (!token || !editingTitle.trim()) {
      cancelEditing();
      return;
    }
    try {
      const res = await axios.post(
        `${API_BASE}/conversations/${id}/rename/`,
        { title: editingTitle.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setConversations((prev) =>
        prev.map((c) => (c.id === id ? { ...c, title: res.data.title } : c))
      );
      cancelEditing();
      toast.success("Conversation title updated");
    } catch (error) {
      toast.error("Failed to update title");
      cancelEditing();
    }
  };

  const fetchStockHistory = async (symbol: string, period: string) => {
      if (!token) return;
      setLoadingChart(true);
      try {
          const res = await axios.get(`${API_BASE}/stocks/history/`, {
              params: { symbol, period },
              headers: { Authorization: `Bearer ${token}` }
          });
          setChartData(res.data);
      } catch (e) {
          console.error("Failed to fetch history", e);
          toast.error("Failed to load chart data");
      } finally {
          setLoadingChart(false);
      }
  };

  const handlePeriodChange = (period: string) => {
      if (sidebarMode === 'single' && sidebarData?.symbol) {
          setChartPeriod(period);
          fetchStockHistory(sidebarData.symbol, period);
      }
  };

  return (
    <div className="flex h-full bg-background text-text-primary overflow-hidden relative">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? "w-72" : "w-0"
        } bg-sidebar transition-all duration-300 ease-in-out flex flex-col border-r border-border overflow-hidden flex-shrink-0`}
      >
        <div className="p-4 h-full flex flex-col">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-surface-hover rounded-full mb-4 text-text-secondary w-fit"
          >
            <Menu className="w-6 h-6" />
          </button>
          <button
            onClick={createConversation}
            className="w-full flex items-center gap-3 px-4 py-3 bg-surface hover:bg-surface-hover rounded-full transition-colors text-sm font-medium text-text-primary mb-6"
          >
            <Plus className="w-5 h-5 text-text-secondary" />
            <span>New chat</span>
          </button>

          {mode === "simulation" && (
            <div className="mb-4 px-4 py-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-yellow-500 text-xs font-medium text-center">
              Simulation Mode
            </div>
          )}

          <div className="text-xs font-medium text-text-secondary mb-2 px-2">
            Recent
          </div>
          <div className="flex-1 overflow-y-auto space-y-1">
            {conversations.map((c) => (
              <div
                key={c.id}
                className={`group flex items-center justify-between px-3 py-2 rounded-full cursor-pointer text-sm ${
                  activeId === c.id
                    ? "bg-primary/20 text-primary"
                    : "hover:bg-surface-hover text-text-primary"
                }`}
                onClick={() => setActiveId(c.id)}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <MessageSquare className="w-4 h-4 flex-shrink-0" />
                  {editingId === c.id ? (
                    <input
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") updateConversationTitle(c.id);
                        if (e.key === "Escape") cancelEditing();
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="bg-transparent outline-none flex-1 min-w-0 border-b border-primary"
                      autoFocus
                    />
                  ) : (
                    <span className="truncate">{c.title}</span>
                  )}
                </div>

                {activeId === c.id && !editingId && (
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpenId(menuOpenId === c.id ? null : c.id);
                      }}
                      className="p-1 hover:text-text-primary text-text-secondary opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                    {menuOpenId === c.id && (
                      <div className="absolute right-0 top-6 w-32 bg-surface border border-border rounded-lg shadow-lg z-10 py-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            startEditing(c.id, c.title);
                          }}
                          className="w-full text-left px-4 py-2 text-xs hover:bg-surface-hover flex items-center gap-2"
                        >
                          <span className="w-4 h-4" /> Rename
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteConversation(c.id);
                          }}
                          className="w-full text-left px-4 py-2 text-xs hover:bg-surface-hover text-red-400 flex items-center gap-2"
                        >
                          <Trash2 className="w-4 h-4" /> Delete
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
          
          <div className="mt-auto pt-4 border-t border-border">
             <Link href="/profile" className="flex items-center gap-3 px-3 py-2 rounded-full hover:bg-surface-hover text-text-secondary hover:text-text-primary transition-colors text-sm">
                <Settings className="w-5 h-5" />
                <span>Settings</span>
             </Link>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full relative min-w-0">
        {/* Header (Mobile/Collapse trigger) */}
        {!sidebarOpen && (
          <div className="absolute top-4 left-4 z-20">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 hover:bg-surface-hover rounded-full text-text-secondary"
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>
        )}

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth">
          <div className="max-w-3xl mx-auto flex flex-col gap-6 pb-32">
            {!active?.messages?.length ? (
              <div className="flex flex-col items-center justify-center mt-20 text-center">
                <h1 className="text-5xl font-medium mb-2 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-red-400">
                  Hello, Trader
                </h1>
                <p className="text-2xl text-text-secondary mb-12">
                  How can I help you today?
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
                  {[
                    { icon: Compass, text: "Get holdings" },
                    { icon: Lightbulb, text: "Buy a share" },
                    { icon: Code, text: "Sell a share" },
                  ].map((item, i) => (
                    <button
                      key={i}
                      onClick={() => setInput(item.text)}
                      className="p-4 bg-surface hover:bg-surface-hover rounded-xl text-left transition-colors flex flex-col gap-4 h-40 justify-between"
                    >
                      <span className="text-text-primary font-medium">
                        {item.text}
                      </span>
                      <div className="w-10 h-10 rounded-full bg-background flex items-center justify-center self-end">
                        <item.icon className="w-5 h-5 text-primary" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              active.messages.map((m, i) => (
                <div
                  key={i}
                  className={`flex gap-4 ${
                    m.role === "user" ? "justify-end" : "justify-start"
                  } animate-fade-in`}
                >
                  {m.role === "assistant" && (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-red-500 flex items-center justify-center flex-shrink-0 mt-1">
                      <span className="text-xs font-bold text-white">AI</span>
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] rounded-2xl px-5 py-3 leading-relaxed ${
                      m.role === "user"
                        ? "bg-surface text-text-primary rounded-br-none"
                        : "text-text-primary"
                    }`}
                  >
                    {m.role === "assistant" ? (
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        rehypePlugins={[rehypeHighlight]}
                        className="prose prose-invert max-w-none"
                      >
                        {m.content}
                      </ReactMarkdown>
                    ) : (
                      m.content
                    )}
                  </div>
                </div>
              ))
            )}
            <div ref={bottomRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="absolute bottom-0 left-0 right-0 bg-background p-4">
          <div className="max-w-3xl mx-auto">
            <div className="bg-surface rounded-full flex items-center px-4 py-3 gap-3 ring-1 ring-transparent focus-within:ring-border/50 transition-all">
              <button className="p-2 hover:bg-surface-hover rounded-full text-text-secondary transition-colors">
                <Plus className="w-5 h-5" />
              </button>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder="Enter a prompt here"
                className="flex-1 bg-transparent outline-none text-text-primary placeholder-text-secondary"
              />
              <button className="p-2 hover:bg-surface-hover rounded-full text-text-secondary transition-colors">
                <ImageIcon className="w-5 h-5" />
              </button>
              <button className="p-2 hover:bg-surface-hover rounded-full text-text-secondary transition-colors">
                <Mic className="w-5 h-5" />
              </button>
              {input.trim() && (
                <button
                  onClick={sendMessage}
                  className="p-2 bg-primary hover:bg-primary-hover rounded-full text-background transition-colors"
                >
                  <SendHorizontal className="w-5 h-5" />
                </button>
              )}
            </div>
            <div className="text-center mt-2">
              <p className="text-xs text-text-secondary">
                Gemini may display inaccurate info, including about people, so
                double-check its responses.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Sidebar Canvas */}
      <div
        className={`${
          showSidebar ? "w-[450px]" : "w-0"
        } bg-surface border-l border-border shadow-2xl flex flex-col transition-all duration-300 ease-in-out overflow-hidden`}
      >
        <div className="flex items-center justify-between p-4 border-b border-border min-w-[300px]">
          <h2 className="text-lg font-medium flex items-center gap-2">
            {sidebarMode === 'holdings' && <PieChartIcon className="w-5 h-5 text-primary" />}
            {sidebarMode === 'single' && <Activity className="w-5 h-5 text-primary" />}
            {sidebarMode === 'list' && <BarChart3 className="w-5 h-5 text-primary" />}
            {sidebarMode === 'movers' && <TrendingUp className="w-5 h-5 text-primary" />}
            
            {sidebarMode === 'holdings' && "Portfolio Analysis"}
            {sidebarMode === 'single' && "Stock Details"}
            {sidebarMode === 'list' && "Market Screener"}
            {sidebarMode === 'movers' && "Market Movers"}
          </h2>
          <button
            onClick={() => setShowSidebar(false)}
            className="p-2 hover:bg-surface-hover rounded-full text-text-secondary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 min-w-[300px] space-y-6">
          
          {/* HOLDINGS VIEW */}
          {sidebarMode === 'holdings' && sidebarData && (
             sidebarData.length > 0 ? (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-surface-hover/30 p-3 rounded-xl border border-border">
                  <div className="text-xs text-text-secondary mb-1">Total Value</div>
                  <div className="text-lg font-semibold text-text-primary">
                    ₹
                    {sidebarData
                      .reduce((acc: any, h: any) => acc + (h.last_price * h.quantity), 0)
                      .toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                  </div>
                </div>
                <div className="bg-surface-hover/30 p-3 rounded-xl border border-border">
                  <div className="text-xs text-text-secondary mb-1">Total P&L</div>
                  <div className={`text-lg font-semibold ${
                    sidebarData.reduce((acc: any, h: any) => acc + h.pnl, 0) >= 0 
                      ? "text-green-400" 
                      : "text-red-400"
                  }`}>
                    {sidebarData.reduce((acc: any, h: any) => acc + h.pnl, 0) >= 0 ? "+" : ""}
                    {sidebarData
                      .reduce((acc: any, h: any) => acc + h.pnl, 0)
                      .toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                  </div>
                </div>
                <div className="bg-surface-hover/30 p-3 rounded-xl border border-border">
                  <div className="text-xs text-text-secondary mb-1">Invested</div>
                  <div className="text-lg font-semibold text-text-primary">
                    ₹
                    {sidebarData
                      .reduce((acc: any, h: any) => acc + (h.average_price * h.quantity), 0)
                      .toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                  </div>
                </div>
                 <div className="bg-surface-hover/30 p-3 rounded-xl border border-border">
                  <div className="text-xs text-text-secondary mb-1">Day's Change</div>
                  <div className={`text-lg font-semibold ${
                     sidebarData.reduce((acc: any, h: any) => acc + ((h.last_price - h.close_price) * h.quantity), 0) >= 0
                      ? "text-green-400"
                      : "text-red-400"
                  }`}>
                     {sidebarData.reduce((acc: any, h: any) => acc + ((h.last_price - h.close_price) * h.quantity), 0) >= 0 ? "+" : ""}
                    {sidebarData
                      .reduce((acc: any, h: any) => acc + ((h.last_price - h.close_price) * h.quantity), 0)
                      .toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                  </div>
                </div>
              </div>

              {/* Allocation Chart */}
              <div className="bg-surface-hover/10 rounded-xl border border-border p-4">
                <h3 className="text-sm font-medium text-text-secondary mb-4">Asset Allocation</h3>
                <div className="h-[200px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={(() => {
                          const sorted = [...sidebarData].sort((a: any, b: any) => 
                            (b.last_price * b.quantity) - (a.last_price * a.quantity)
                          );
                          const top5 = sorted.slice(0, 5);
                          const others = sorted.slice(5);
                          
                          const data = top5.map((h: any) => ({
                            name: h.tradingsymbol,
                            value: h.last_price * h.quantity
                          }));
                          
                          if (others.length > 0) {
                            data.push({
                              name: "Others",
                              value: others.reduce((acc: any, h: any) => acc + (h.last_price * h.quantity), 0)
                            });
                          }
                          return data;
                        })()}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {[...Array(6)].map((_, index) => (
                          <Cell key={`cell-${index}`} fill={[
                            "#60A5FA", "#34D399", "#F87171", "#FBBF24", "#A78BFA", "#9CA3AF"
                          ][index % 6]} />
                        ))}
                      </Pie>
                      <RechartsTooltip 
                        formatter={(value: number) => `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
                        contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', color: '#F3F4F6' }}
                        itemStyle={{ color: '#F3F4F6' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap gap-2 justify-center mt-2">
                   {(() => {
                          const sorted = [...sidebarData].sort((a: any, b: any) => 
                            (b.last_price * b.quantity) - (a.last_price * a.quantity)
                          );
                          const top5 = sorted.slice(0, 5);
                          const others = sorted.slice(5);
                          const items = top5.map((h: any) => h.tradingsymbol);
                          if (others.length > 0) items.push("Others");
                          
                          return items.map((item, index) => (
                            <div key={index} className="flex items-center gap-1 text-[10px] text-text-secondary">
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: [
                                "#60A5FA", "#34D399", "#F87171", "#FBBF24", "#A78BFA", "#9CA3AF"
                              ][index % 6] }} />
                              {item}
                            </div>
                          ));
                   })()}
                </div>
              </div>

              {/* Holdings Table */}
              <div>
                <h3 className="text-sm font-medium text-text-secondary mb-3">Holdings Details</h3>
                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-text-secondary uppercase bg-surface-hover/50">
                      <tr>
                        <th className="px-3 py-2">Symbol</th>
                        <th className="px-3 py-2 text-right">Qty</th>
                        <th className="px-3 py-2 text-right">LTP</th>
                        <th className="px-3 py-2 text-right">P&L</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sidebarData.map((h: any, i: number) => (
                        <tr
                          key={i}
                          className="border-b border-border hover:bg-surface-hover/30 last:border-0"
                        >
                          <td className="px-3 py-2 font-medium">
                            <div className="flex flex-col">
                              <span>{h.tradingsymbol}</span>
                              <span className="text-[10px] text-text-secondary">{h.exchange}</span>
                            </div>
                          </td>
                          <td className="px-3 py-2 text-right">{h.quantity}</td>
                          <td className="px-3 py-2 text-right">
                            <div className="flex flex-col">
                               <span>{h.last_price?.toFixed(2)}</span>
                               <span className={`text-[10px] ${
                                 (h.last_price - h.close_price) >= 0 ? "text-green-400" : "text-red-400"
                               }`}>
                                 {(h.last_price - h.close_price) >= 0 ? "+" : ""}
                                 {((h.last_price - h.close_price) / h.close_price * 100).toFixed(2)}%
                               </span>
                            </div>
                          </td>
                          <td
                            className={`px-3 py-2 text-right font-medium ${
                              h.pnl >= 0 ? "text-green-400" : "text-red-400"
                            }`}
                          >
                            {h.pnl?.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
             <div className="flex flex-col items-center justify-center h-64 text-text-secondary">
                <PieChartIcon className="w-12 h-12 mb-4 opacity-20" />
                <p>No holdings found</p>
             </div>
          ))}

          {/* SINGLE STOCK VIEW */}
          {sidebarMode === 'single' && sidebarData && (
            <>
               <div className="flex items-center justify-between mb-2">
                  <div>
                    <h1 className="text-2xl font-bold text-text-primary">{sidebarData.symbol}</h1>
                    <p className="text-sm text-text-secondary">{sidebarData.name}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-text-primary">
                        ₹{sidebarData.current_price?.toLocaleString('en-IN')}
                    </div>
                    {sidebarData.current_price && sidebarData.previous_close && (
                        <div className={`text-sm font-medium ${
                            sidebarData.current_price >= sidebarData.previous_close ? "text-green-400" : "text-red-400"
                        }`}>
                            {sidebarData.current_price >= sidebarData.previous_close ? "+" : ""}
                            {((sidebarData.current_price - sidebarData.previous_close) / sidebarData.previous_close * 100).toFixed(2)}%
                        </div>
                    )}
                  </div>
               </div>

               <div className="grid grid-cols-2 gap-3">
                  <div className="bg-surface-hover/30 p-3 rounded-xl border border-border">
                     <div className="text-xs text-text-secondary mb-1">Open</div>
                     <div className="font-medium">₹{sidebarData.open?.toLocaleString('en-IN')}</div>
                  </div>
                  <div className="bg-surface-hover/30 p-3 rounded-xl border border-border">
                     <div className="text-xs text-text-secondary mb-1">Prev. Close</div>
                     <div className="font-medium">₹{sidebarData.previous_close?.toLocaleString('en-IN')}</div>
                  </div>
                  <div className="bg-surface-hover/30 p-3 rounded-xl border border-border">
                     <div className="text-xs text-text-secondary mb-1">Day High</div>
                     <div className="font-medium text-green-400">₹{sidebarData.day_high?.toLocaleString('en-IN')}</div>
                  </div>
                  <div className="bg-surface-hover/30 p-3 rounded-xl border border-border">
                     <div className="text-xs text-text-secondary mb-1">Day Low</div>
                     <div className="font-medium text-red-400">₹{sidebarData.day_low?.toLocaleString('en-IN')}</div>
                  </div>
               </div>

               {/* Performance Chart */}
               <div className="bg-surface-hover/10 rounded-xl border border-border p-4">
                  <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-medium text-text-secondary">Performance</h3>
                      <div className="flex bg-surface rounded-lg p-1 gap-1">
                          {['1d', '5d', '1mo', '6mo', '1y', '5y'].map((p) => (
                              <button
                                  key={p}
                                  onClick={() => handlePeriodChange(p)}
                                  className={`px-2 py-1 text-[10px] rounded-md transition-colors ${
                                      chartPeriod === p 
                                      ? 'bg-primary text-white' 
                                      : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover'
                                  }`}
                              >
                                  {p.toUpperCase()}
                              </button>
                          ))}
                      </div>
                  </div>
                  
                  <div className="h-[200px] w-full relative">
                      {loadingChart && (
                          <div className="absolute inset-0 flex items-center justify-center bg-surface/50 z-10 backdrop-blur-sm">
                              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                          </div>
                      )}
                      <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={chartData}>
                              <defs>
                                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="5%" stopColor="#34D399" stopOpacity={0.3}/>
                                      <stop offset="95%" stopColor="#34D399" stopOpacity={0}/>
                                  </linearGradient>
                              </defs>
                              <XAxis 
                                  dataKey="time" 
                                  hide 
                              />
                              <YAxis 
                                  domain={['auto', 'auto']} 
                                  hide 
                              />
                              <RechartsTooltip
                                  contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', color: '#F3F4F6' }}
                                  itemStyle={{ color: '#34D399' }}
                                  labelFormatter={(label) => {
                                      const date = new Date(label);
                                      return chartPeriod === '1d' || chartPeriod === '5d'
                                          ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                          : date.toLocaleDateString();
                                  }}
                                  formatter={(value: number) => [`₹${value.toFixed(2)}`, 'Price']}
                              />
                              <Area 
                                  type="monotone" 
                                  dataKey="value" 
                                  stroke="#34D399" 
                                  fillOpacity={1} 
                                  fill="url(#colorValue)" 
                              />
                          </AreaChart>
                      </ResponsiveContainer>
                  </div>
               </div>

               <div className="space-y-3">
                  <div className="flex justify-between py-2 border-b border-border">
                     <span className="text-text-secondary text-sm">Market Cap</span>
                     <span className="font-medium text-sm">
                        {sidebarData.market_cap ? `₹${(sidebarData.market_cap / 10000000).toFixed(2)} Cr` : 'N/A'}
                     </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-border">
                     <span className="text-text-secondary text-sm">P/E Ratio</span>
                     <span className="font-medium text-sm">{sidebarData.pe_ratio?.toFixed(2) || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-border">
                     <span className="text-text-secondary text-sm">Dividend Yield</span>
                     <span className="font-medium text-sm">
                        {sidebarData.dividend_yield ? `${(sidebarData.dividend_yield * 100).toFixed(2)}%` : 'N/A'}
                     </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-border">
                     <span className="text-text-secondary text-sm">52W High</span>
                     <span className="font-medium text-sm">₹{sidebarData['52_week_high']?.toLocaleString('en-IN')}</span>
                  </div>
                   <div className="flex justify-between py-2 border-b border-border">
                     <span className="text-text-secondary text-sm">52W Low</span>
                     <span className="font-medium text-sm">₹{sidebarData['52_week_low']?.toLocaleString('en-IN')}</span>
                  </div>
               </div>
            </>
          )}

          {/* LIST VIEW (SCREENER) */}
          {sidebarMode === 'list' && sidebarData && (
             <>
                <div className="mb-4">
                   <h3 className="text-lg font-medium text-text-primary mb-1">Recommendations</h3>
                   <p className="text-xs text-text-secondary">Based on technical analysis</p>
                </div>
                
                <div className="space-y-2">
                   {sidebarData.map((stock: any, i: number) => (
                      <div key={i} className="bg-surface-hover/20 p-3 rounded-xl border border-border flex justify-between items-center hover:bg-surface-hover/40 transition-colors cursor-pointer">
                         <div>
                            <div className="font-bold text-text-primary">{stock.symbol}</div>
                            <div className="text-xs text-text-secondary mt-1">{stock.signal}</div>
                         </div>
                         <div className="text-right">
                            <div className="font-medium">₹{stock.price?.toLocaleString('en-IN')}</div>
                         </div>
                      </div>
                   ))}
                </div>
             </>
          )}

          {/* MOVERS VIEW */}
          {sidebarMode === 'movers' && sidebarData && (
             <>
                <div className="space-y-6">
                   <div>
                      <h3 className="text-sm font-medium text-green-400 mb-3 flex items-center gap-2">
                         <TrendingUp className="w-4 h-4" /> Top Gainers
                      </h3>
                      <div className="space-y-2">
                         {sidebarData.top_gainers?.map((stock: any, i: number) => (
                            <div key={i} className="bg-surface-hover/20 p-3 rounded-xl border border-border flex justify-between items-center">
                               <div>
                                  <div className="font-bold text-text-primary">{stock.symbol}</div>
                                  <div className="text-xs text-text-secondary">₹{stock.price?.toLocaleString('en-IN')}</div>
                               </div>
                               <div className="text-green-400 font-bold text-sm">
                                  +{stock.change_pct}%
                               </div>
                            </div>
                         ))}
                      </div>
                   </div>

                   <div>
                      <h3 className="text-sm font-medium text-red-400 mb-3 flex items-center gap-2">
                         <TrendingDown className="w-4 h-4" /> Top Losers
                      </h3>
                      <div className="space-y-2">
                         {sidebarData.top_losers?.map((stock: any, i: number) => (
                            <div key={i} className="bg-surface-hover/20 p-3 rounded-xl border border-border flex justify-between items-center">
                               <div>
                                  <div className="font-bold text-text-primary">{stock.symbol}</div>
                                  <div className="text-xs text-text-secondary">₹{stock.price?.toLocaleString('en-IN')}</div>
                               </div>
                               <div className="text-red-400 font-bold text-sm">
                                  {stock.change_pct}%
                               </div>
                            </div>
                         ))}
                      </div>
                   </div>
                </div>
             </>
          )}

        </div>
      </div>
    </div>
  );
}
