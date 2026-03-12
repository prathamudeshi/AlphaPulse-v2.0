import React, { useState, useEffect } from 'react';
import Joyride, { CallBackProps, STATUS, Step } from 'react-joyride';

interface PlaygroundTutorialProps {
  run: boolean;
  setRun: (run: boolean) => void;
  setIsSidebarOpen: (isOpen: boolean) => void;
}

const PlaygroundTutorial: React.FC<PlaygroundTutorialProps> = ({ run, setRun, setIsSidebarOpen }) => {
  const [mounted, setMounted] = useState(false);
  const [steps] = useState<Step[]>([
    {
      target: '#tutorial-welcome',
      content: (
        <div>
          <h3 className="font-bold text-lg mb-2">Welcome to the Algo Playground! 🧪</h3>
          <p>This is your safe space to experiment with trading strategies without risking real money.</p>
          <p className="mt-2">Let's take a quick tour to show you how to build and test your first algorithm.</p>
        </div>
      ),
      disableBeacon: true,
      placement: 'center',
    },
    {
      target: '#tutorial-stock-selector',
      content: (
        <div>
          <h3 className="font-bold text-lg mb-2">1. Pick a Stock 📈</h3>
          <p>Enter the symbol of the stock you want to test (e.g., RELIANCE, TCS, INFY).</p>
        </div>
      ),
      placement: 'auto',
      spotlightPadding: 8,
    },
    {
      target: '#tutorial-strategy-selector',
      content: (
        <div>
          <h3 className="font-bold text-lg mb-2">2. Choose Your Strategy 🧠</h3>
          <p>Start by selecting a trading strategy.</p>
          <ul className="list-disc pl-4 mt-2 text-sm">
            <li><strong>SMA Crossover:</strong> Good for catching trends.</li>
            <li><strong>RSI Reversal:</strong> Good for catching bounces.</li>
          </ul>
        </div>
      ),
      placement: 'auto',
      spotlightPadding: 8,
    },
    {
      target: '#tutorial-strategy-params',
      content: (
        <div>
          <h3 className="font-bold text-lg mb-2">3. Tweak the Parameters 🎛️</h3>
          <p>Customize how the strategy behaves.</p>
          <p className="mt-2 text-sm">For example, changing the "Short Window" makes the strategy faster or slower to react.</p>
        </div>
      ),
      placement: 'auto',
      spotlightPadding: 8,
    },
    {
      target: '#tutorial-run-button',
      content: (
        <div>
          <h3 className="font-bold text-lg mb-2">4. Run the Backtest 🚀</h3>
          <p>Click this button to simulate your strategy on historical data.</p>
          <p className="mt-2 text-sm">It will calculate how much money you would have made (or lost!).</p>
        </div>
      ),
      placement: 'auto',
      spotlightPadding: 8,
    },
    {
      target: '#tutorial-backtest-chart',
      content: (
        <div>
          <h3 className="font-bold text-lg mb-2">5. Analyze Results 📈</h3>
          <p>The chart shows your portfolio value over time.</p>
          <p className="mt-2 text-sm">Look for a line that goes up! The green/red markers show where the algorithm bought and sold.</p>
        </div>
      ),
      placement: 'auto',
      spotlightPadding: 8,
    },
    {
      target: '#tutorial-playground-chat',
      content: (
        <div>
          <h3 className="font-bold text-lg mb-2">6. Ask the AI 🤖</h3>
          <p>Confused? Ask the AI to explain the results or suggest improvements.</p>
          <p className="mt-2 text-sm">Try asking: "Why did this strategy lose money?"</p>
        </div>
      ),
      placement: 'auto',
      spotlightPadding: 8,
    },
  ]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (run) {
      setIsSidebarOpen(true);
    }
  }, [run, setIsSidebarOpen]);

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status } = data;
    const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];

    if (finishedStatuses.includes(status)) {
      setRun(false);
      // Optional: Save to localStorage so it doesn't show again automatically
      localStorage.setItem('playground_tutorial_seen', 'true');
    }
  };

  if (!mounted) return null;

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous
      showProgress
      showSkipButton
      callback={handleJoyrideCallback}
      scrollOffset={150}
      disableScrolling={true}
      styles={{
        options: {
          primaryColor: '#3b82f6', // Match your theme blue
          textColor: '#333',
          zIndex: 10000,
        },
        tooltipContainer: {
          textAlign: 'left',
        },
        buttonNext: {
          backgroundColor: '#3b82f6',
        },
        buttonBack: {
          color: '#666',
        }
      }}
      locale={{
        last: 'Finish',
        skip: 'Skip',
      }}
    />
  );
};

export default PlaygroundTutorial;
