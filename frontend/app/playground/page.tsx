"use client";

import React, { useState } from 'react';
import StrategyControls from '../../components/Playground/StrategyControls';
import BacktestChart from '../../components/Playground/BacktestChart';
import PlaygroundChat from '../../components/Playground/PlaygroundChat';
import PlaygroundTutorial from '../../components/Playground/PlaygroundTutorial';
import PlaygroundSidebar from '../../components/Playground/PlaygroundSidebar';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { HelpCircle } from 'lucide-react';

export default function Playground() {
  const [strategy, setStrategy] = useState('sma');
  const [params, setParams] = useState({ short_window: 50, long_window: 200 });
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [runTutorial, setRunTutorial] = useState(false);
  const [symbol, setSymbol] = useState('RELIANCE');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Check if tutorial has been seen on mount
  React.useEffect(() => {
    const seen = localStorage.getItem('playground_tutorial_seen');
    if (!seen) {
      setRunTutorial(true);
    }
  }, []);

  const runBacktest = async () => {
    setLoading(true);
    try {
      const response = await axios.post('http://localhost:8000/api/backtest_strategy/', {
        symbol: symbol,
        strategy,
        parameters: params,
        period: '1y'
      });
      setResults(response.data);
      toast.success('Backtest complete!');
    } catch (error) {
      console.error(error);
      toast.error('Backtest failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen bg-background text-text-primary font-sans flex flex-col overflow-hidden">
      
      <PlaygroundTutorial 
        run={runTutorial} 
        setRun={setRunTutorial} 
        setIsSidebarOpen={setIsSidebarOpen}
      />

      <header className="p-6 pb-0 flex justify-between items-start" id="tutorial-welcome">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
            Algo Playground
          </h1>
          <p className="text-text-secondary mt-2">
            Welcome to the lab! Here you can experiment with trading algorithms without risking any money.
            See how different rules would have performed in the past.
          </p>
        </div>
        <button
          onClick={() => setRunTutorial(true)}
          className="p-2 text-text-secondary hover:text-primary transition-colors"
          title="Start Tutorial"
        >
          <HelpCircle size={24} />
        </button>
      </header>
      
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <PlaygroundSidebar 
          isOpen={isSidebarOpen}
          toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          symbol={symbol}
          setSymbol={setSymbol}
          strategy={strategy}
          setStrategy={setStrategy}
          params={params}
          setParams={setParams}
          onRunBacktest={runBacktest}
          loading={loading}
        />

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden max-h-[91%]">
          <div className="flex-1 p-6 overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
              {/* Center: Chart (8 cols) */}
              <div className="lg:col-span-8 flex flex-col gap-6 h-full overflow-hidden">
                <div className="bg-surface p-4 rounded-lg border border-border flex-1 flex flex-col min-h-0">
                  <h2 className="text-xl font-bold mb-4 text-text-primary flex justify-between items-center shrink-0">
                    <span>Performance: {symbol} (1 Year)</span>
                    {results && (
                      <span className={`text-sm ${results.metrics.total_return >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        Return: {results.metrics.total_return}%
                      </span>
                    )}
                  </h2>
                  
                  <div className="flex-1 min-h-0">
                    <BacktestChart 
                      data={results?.equity_curve || []} 
                      trades={results?.trades || []}
                      strategy={strategy}
                    />
                  </div>
                </div>
              </div>

              {/* Right: Chat (4 cols) */}
              <div className="lg:col-span-4 h-full overflow-hidden">
                <PlaygroundChat 
                  results={results}
                  strategy={strategy}
                  params={params}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
