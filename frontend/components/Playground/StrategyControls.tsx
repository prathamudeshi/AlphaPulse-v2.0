"use client";

import React from 'react';

interface StrategyControlsProps {
  symbol: string;
  setSymbol: (s: string) => void;
  strategy: string;
  setStrategy: (s: string) => void;
  params: any;
  setParams: (p: any) => void;
  onRunBacktest: () => void;
  loading: boolean;
}

const StrategyControls: React.FC<StrategyControlsProps> = ({
  symbol,
  setSymbol,
  strategy,
  setStrategy,
  params,
  setParams,
  onRunBacktest,
  loading
}) => {
  
  const handleParamChange = (key: string, value: number) => {
    setParams({ ...params, [key]: value });
  };

  return (
    <div className="bg-surface p-4 rounded-lg border border-border">
      <h2 className="text-xl font-bold mb-4 text-text-primary">Strategy Config</h2>
      
      <div className="mb-6" id="tutorial-stock-selector">
        <label className="block text-text-secondary mb-2">Stock Symbol</label>
        <input 
          type="text"
          value={symbol}
          onChange={(e) => setSymbol(e.target.value.toUpperCase())}
          className="w-full bg-input text-text-primary p-2 rounded border border-border focus:outline-none focus:border-primary uppercase"
          placeholder="e.g. RELIANCE"
        />
      </div>

      <div className="mb-6" id="tutorial-strategy-selector">
        <label className="block text-text-secondary mb-2">Strategy Type</label>
        <select 
          value={strategy}
          onChange={(e) => {
            setStrategy(e.target.value);
            // Reset params based on strategy
            if (e.target.value === 'sma') {
              setParams({ short_window: 50, long_window: 200 });
            } else if (e.target.value === 'rsi') {
              setParams({ period: 14, overbought: 70, oversold: 30 });
            }
          }}
          className="w-full bg-input text-text-primary p-2 rounded border border-border focus:outline-none focus:border-primary"
        >
          <option value="sma">SMA Crossover</option>
          <option value="rsi">RSI Reversal</option>
        </select>
      </div>

      <div className="space-y-4" id="tutorial-strategy-params">
        {strategy === 'sma' && (
          <>
            <div>
              <label className="block text-text-secondary mb-1">Short Window: {params.short_window}</label>
              <input 
                type="range" 
                min="5" max="100" 
                value={params.short_window}
                onChange={(e) => handleParamChange('short_window', parseInt(e.target.value))}
                className="w-full accent-primary"
              />
            </div>
            <div>
              <label className="block text-text-secondary mb-1">Long Window: {params.long_window}</label>
              <input 
                type="range" 
                min="50" max="365" 
                value={params.long_window}
                onChange={(e) => handleParamChange('long_window', parseInt(e.target.value))}
                className="w-full accent-primary"
              />
            </div>
          </>
        )}

        {strategy === 'rsi' && (
          <>
            <div>
              <label className="block text-text-secondary mb-1">Period: {params.period}</label>
              <input 
                type="range" 
                min="2" max="50" 
                value={params.period}
                onChange={(e) => handleParamChange('period', parseInt(e.target.value))}
                className="w-full accent-primary"
              />
            </div>
            <div>
              <label className="block text-text-secondary mb-1">Overbought: {params.overbought}</label>
              <input 
                type="range" 
                min="50" max="95" 
                value={params.overbought}
                onChange={(e) => handleParamChange('overbought', parseInt(e.target.value))}
                className="w-full accent-primary"
              />
            </div>
            <div>
              <label className="block text-text-secondary mb-1">Oversold: {params.oversold}</label>
              <input 
                type="range" 
                min="5" max="50" 
                value={params.oversold}
                onChange={(e) => handleParamChange('oversold', parseInt(e.target.value))}
                className="w-full accent-primary"
              />
            </div>
          </>
        )}
      </div>

      <button
        id="tutorial-run-button"
        onClick={onRunBacktest}
        disabled={loading}
        className={`mt-8 w-full py-2 px-4 rounded font-bold text-background transition-colors ${
          loading ? 'bg-text-secondary cursor-not-allowed' : 'bg-primary hover:bg-primary-hover'
        }`}
      >
        {loading ? 'Running...' : 'Run Backtest'}
      </button>
      
      <div className="mt-4 text-xs text-text-secondary">
        <p>Tweak the parameters and click Run to see how the strategy performs on historical data.</p>
      </div>
    </div>
  );
};

export default StrategyControls;
