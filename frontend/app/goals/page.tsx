"use client";
import { useState, useEffect } from "react";
import { api } from "../../lib/api";
import { Plus, Target, TrendingUp, AlertCircle, CheckCircle, ArrowRight, Save, X, Loader2 } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { toast } from "react-hot-toast";

interface GoalItem {
  symbol: string;
  allocation: number;
  reason?: string;
}

interface Goal {
  id: number;
  name: string;
  target_amount: number;
  current_amount: number;
  deadline: string;
  monthly_contribution: number;
  status: "On Track" | "Behind" | "Ahead";
  insight: string;
  items: GoalItem[];
}

interface PlanResult {
  monthly_contribution: number;
  total_investment: number;
  estimated_returns: number;
  portfolio: GoalItem[];
  message: string;
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d"];

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  
  // Wizard State
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: "",
    target_amount: "",
    years: "3",
    risk_profile: "balanced",
  });
  const [plan, setPlan] = useState<PlanResult | null>(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetchGoals();
  }, []);

  const fetchGoals = async () => {
    try {
      const res = await api.get("/goals/");
      setGoals(res.data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch goals");
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePlan = async () => {
    if (!formData.target_amount || !formData.years) {
      toast.error("Please fill in all fields");
      return;
    }
    setGenerating(true);
    try {
      const res = await api.post("/goals/plan/", {
        target_amount: parseFloat(formData.target_amount),
        years: parseFloat(formData.years),
        risk_profile: formData.risk_profile,
      });
      setPlan(res.data);
      setStep(2);
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate plan");
    } finally {
      setGenerating(false);
    }
  };

  const handleCreateGoal = async () => {
    if (!plan) return;
    try {
      // Calculate deadline date
      const date = new Date();
      date.setFullYear(date.getFullYear() + parseFloat(formData.years));
      const deadline = date.toISOString().split("T")[0];

      await api.post("/goals/create/", {
        name: formData.name,
        target_amount: parseFloat(formData.target_amount),
        deadline: deadline,
        monthly_contribution: plan.monthly_contribution,
        items: plan.portfolio,
      });
      toast.success("Goal created successfully!");
      setShowModal(false);
      resetForm();
      fetchGoals();
    } catch (err) {
      console.error(err);
      toast.error("Failed to create goal");
    }
  };

  const resetForm = () => {
    setStep(1);
    setFormData({ name: "", target_amount: "", years: "3", risk_profile: "balanced" });
    setPlan(null);
  };

  const handleUpdateProgress = async (id: number, amount: string) => {
      try {
          await api.post(`/goals/${id}/progress/`, { amount: parseFloat(amount) });
          toast.success("Progress updated");
          fetchGoals();
      } catch (err) {
          toast.error("Failed to update progress");
      }
  };

  return (
    <div className="min-h-screen bg-background text-text-primary p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Portfolio Architect</h1>
            <p className="text-text-secondary">Build and track your financial dreams.</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-black px-6 py-3 rounded-full font-medium transition-colors"
          >
            <Plus size={20} color="black" />
            New Goal
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-primary" size={40} />
          </div>
        ) : goals.length === 0 ? (
          <div className="text-center py-20 bg-surface rounded-2xl border border-border">
            <Target className="mx-auto text-text-secondary mb-4" size={48} />
            <h3 className="text-xl font-medium mb-2">No goals yet</h3>
            <p className="text-text-secondary mb-6">Start by creating your first financial goal.</p>
            <button
              onClick={() => setShowModal(true)}
              className="text-primary hover:underline font-medium"
            >
              Create a Goal
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {goals.map((goal) => (
              <div key={goal.id} className="bg-surface rounded-2xl border border-border p-6 flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold">{goal.name}</h3>
                    <p className="text-sm text-text-secondary">Target: ₹{goal.target_amount.toLocaleString()}</p>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                    goal.status === 'On Track' ? 'bg-green-500/10 text-green-500' :
                    goal.status === 'Ahead' ? 'bg-blue-500/10 text-blue-500' :
                    'bg-red-500/10 text-red-500'
                  }`}>
                    {goal.status}
                  </div>
                </div>

                <div className="mb-6">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-text-secondary">Progress</span>
                    <span>{Math.round((goal.current_amount / goal.target_amount) * 100)}%</span>
                  </div>
                  <div className="h-2 bg-background rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${
                        goal.status === 'Behind' ? 'bg-red-500' : 'bg-primary'
                      }`}
                      style={{ width: `${Math.min((goal.current_amount / goal.target_amount) * 100, 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-text-secondary mt-1">
                    <span>₹{goal.current_amount.toLocaleString()}</span>
                    <span>Deadline: {goal.deadline}</span>
                  </div>
                </div>

                <div className="bg-background rounded-xl p-4 mb-4 flex-1">
                  <div className="flex items-start gap-3">
                    <AlertCircle size={18} className="text-primary shrink-0 mt-0.5" />
                    <p className="text-sm">{goal.insight}</p>
                  </div>
                </div>
                
                <div className="mt-auto pt-4 border-t border-border">
                    <div className="flex items-center gap-2">
                        <input 
                            type="number" 
                            placeholder="Update Amount"
                            className="bg-background border border-border rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:border-primary"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    handleUpdateProgress(goal.id, (e.target as HTMLInputElement).value);
                                    (e.target as HTMLInputElement).value = '';
                                }
                            }}
                        />
                        <button className="p-2 bg-surface-hover rounded-lg text-text-secondary hover:text-primary">
                            <TrendingUp size={18} />
                        </button>
                    </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-surface rounded-3xl border border-border w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
              <div className="p-6 border-b border-border flex justify-between items-center">
                <h2 className="text-2xl font-bold">
                  {step === 1 ? "Define Your Goal" : "Your Portfolio Plan"}
                </h2>
                <button onClick={() => { setShowModal(false); resetForm(); }} className="text-text-secondary hover:text-text-primary">
                  <X size={24} />
                </button>
              </div>

              <div className="p-6">
                {step === 1 ? (
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-text-secondary mb-2">Goal Name</label>
                      <input
                        type="text"
                        placeholder="e.g., Dream Car, World Tour"
                        className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:outline-none focus:border-primary transition-colors"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-text-secondary mb-2">Target Amount (₹)</label>
                        <input
                          type="number"
                          placeholder="1000000"
                          className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:outline-none focus:border-primary transition-colors"
                          value={formData.target_amount}
                          onChange={(e) => setFormData({ ...formData, target_amount: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-text-secondary mb-2">Time Horizon (Years)</label>
                        <input
                          type="number"
                          placeholder="3"
                          className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:outline-none focus:border-primary transition-colors"
                          value={formData.years}
                          onChange={(e) => setFormData({ ...formData, years: e.target.value })}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text-secondary mb-2">Risk Profile</label>
                      <div className="grid grid-cols-3 gap-4">
                        {['conservative', 'balanced', 'aggressive'].map((profile) => (
                          <button
                            key={profile}
                            onClick={() => setFormData({ ...formData, risk_profile: profile })}
                            className={`py-3 px-4 rounded-xl border capitalize transition-all ${
                              formData.risk_profile === profile
                                ? "bg-primary text-white border-primary"
                                : "bg-background border-border text-text-secondary hover:border-primary/50"
                            }`}
                          >
                            {profile}
                          </button>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={handleGeneratePlan}
                      disabled={generating}
                      className="w-full bg-primary hover:bg-primary-hover text-white py-4 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2 mt-4"
                    >
                      {generating ? (
                        <>
                          <Loader2 className="animate-spin" /> Architecting...
                        </>
                      ) : (
                        <>
                          Generate Plan <ArrowRight size={20} />
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="bg-background rounded-2xl p-6 border border-border">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 bg-green-500/10 rounded-full text-green-500">
                          <TrendingUp size={24} />
                        </div>
                        <div>
                          <p className="text-sm text-text-secondary">Required Monthly Investment</p>
                          <h3 className="text-3xl font-bold">₹{plan?.monthly_contribution.toLocaleString()}</h3>
                        </div>
                      </div>
                      <p className="text-text-secondary text-sm">{plan?.message}</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={plan?.portfolio}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={80}
                              paddingAngle={5}
                              dataKey="allocation"
                            >
                              {plan?.portfolio.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip 
                                contentStyle={{ backgroundColor: '#1e1e1e', borderColor: '#333', borderRadius: '8px' }}
                                itemStyle={{ color: '#fff' }}
                            />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="space-y-3">
                        <h4 className="font-medium mb-2">Recommended Portfolio</h4>
                        {plan?.portfolio.map((item, idx) => (
                          <div key={idx} className="flex justify-between items-center p-3 bg-background rounded-lg border border-border">
                            <div className="flex items-center gap-3">
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                              <div>
                                <p className="font-medium">{item.symbol}</p>
                                <p className="text-xs text-text-secondary">{item.reason}</p>
                              </div>
                            </div>
                            <span className="font-bold">{item.allocation}%</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-4 pt-4">
                      <button
                        onClick={() => setStep(1)}
                        className="flex-1 py-3 px-6 rounded-xl border border-border hover:bg-surface-hover transition-colors"
                      >
                        Back
                      </button>
                      <button
                        onClick={handleCreateGoal}
                        className="flex-1 bg-primary hover:bg-primary-hover text-white py-3 px-6 rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
                      >
                        <Save size={20} /> Confirm & Start Goal
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
