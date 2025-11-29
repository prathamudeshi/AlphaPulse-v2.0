import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import StrategyControls from './StrategyControls';

interface PlaygroundSidebarProps {
  isOpen: boolean;
  toggleSidebar: () => void;
  symbol: string;
  setSymbol: (s: string) => void;
  strategy: string;
  setStrategy: (s: string) => void;
  params: any;
  setParams: (p: any) => void;
  onRunBacktest: () => void;
  loading: boolean;
}

const PlaygroundSidebar: React.FC<PlaygroundSidebarProps> = ({
  isOpen,
  toggleSidebar,
  symbol,
  setSymbol,
  strategy,
  setStrategy,
  params,
  setParams,
  onRunBacktest,
  loading
}) => {
  return (
    <div 
      className={`max-h-[85%] rounded-xl ml-5 mt-5 relative bg-surface border-r border-border transition-all duration-300 ease-in-out flex flex-col ${
        isOpen ? 'w-80' : 'w-0'
      }`}
    >
      {/* Toggle Button */}
      <button
        onClick={toggleSidebar}
        className="absolute -right-3 top-6 bg-surface border border-border rounded-full p-1 text-text-secondary hover:text-primary z-10"
      >
        {isOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
      </button>

      {/* Content Container */}
      <div className={`flex-1 overflow-y-auto p-4 space-y-6 ${isOpen ? 'opacity-100' : 'opacity-0 hidden'}`}>
        
        <StrategyControls 
          symbol={symbol}
          setSymbol={setSymbol}
          strategy={strategy}
          setStrategy={setStrategy}
          params={params}
          setParams={setParams}
          onRunBacktest={onRunBacktest}
          loading={loading}
        />
        
        {/* Strategy Guide */}
        <div className="bg-surface p-4 rounded-lg border border-border">
          <h3 className="text-lg font-bold text-text-primary mb-3">Beginner's Guide</h3>
          <div className="text-sm text-text-secondary space-y-4">
            {strategy === 'sma' && (
              <>
                <div>
                  <strong className="text-primary block mb-1">What is a Moving Average (SMA)?</strong>
                  <p>Imagine smoothing out the jagged price line. The "Short Window" is a fast line (like a speedboat) that reacts quickly. The "Long Window" is a slow line (like a cruise ship) that shows the big trend.</p>
                </div>
                <div>
                  <strong className="text-primary block mb-1">The Strategy</strong>
                  <ul className="list-disc pl-4 space-y-1">
                    <li>
                      <strong>Golden Cross (Buy):</strong> When the fast line crosses UP over the slow line. It means momentum is shifting up!
                    </li>
                    <li>
                      <strong>Death Cross (Sell):</strong> When the fast line crosses DOWN below the slow line. It means momentum is crashing.
                    </li>
                  </ul>
                </div>
                <div className="bg-surface-hover p-2 rounded text-xs italic">
                  Try setting Short=10 and Long=50. See how many more trades you get compared to 50/200?
                </div>
              </>
            )}
            {strategy === 'rsi' && (
              <>
                <div>
                  <strong className="text-primary block mb-1">What is RSI?</strong>
                  <p>The Relative Strength Index (RSI) is like a speedometer for the stock. It goes from 0 to 100.</p>
                </div>
                <div>
                  <strong className="text-primary block mb-1">The Strategy</strong>
                  <ul className="list-disc pl-4 space-y-1">
                    <li>
                      <strong>Oversold (Buy):</strong> When RSI is below {(params as any).oversold} (usually 30). It means the stock was sold too much, too fast, and might bounce back up (like a stretched rubber band).
                    </li>
                    <li>
                      <strong>Overbought (Sell):</strong> When RSI is above {(params as any).overbought} (usually 70). It means the stock went up too fast and might cool down.
                    </li>
                  </ul>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlaygroundSidebar;
