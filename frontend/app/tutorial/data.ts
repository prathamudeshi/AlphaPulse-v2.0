import {
  Key, TrendingUp, PieChart, Search, Lightbulb, Target,
  Gamepad2, FlaskConical, Trophy, UserCog, MessageCircle
} from "lucide-react";

export interface HelpItem {
  id: string;
  title: string;
  shortDescription: string;
  fullDescription: React.ReactNode;
  gradient: string;
  icon: any;
  image: string;
}

export const helpItems: HelpItem[] = [
  {
    id: "api-setup",
    title: "Setting up API Key",
    shortDescription: "Connect your Zerodha Kite account to enable trading features.",
    gradient: "from-blue-600 to-indigo-600",
    icon: Key,
    image: "/tutorial/api-setup.png",
    fullDescription: `To start trading with AlphaPulse, you need to link your Zerodha Kite account. This is a secure, one-time setup that allows our AI to execute trades on your behalf.

**Step-by-Step Guide:**
1. **Log in to Zerodha Console**: Go to developers.kite.trade and log in.
2. **Create an App**: Create a new app (e.g., "AlphaPulse"). You will get an 'API Key' and 'API Secret'.
3. **Enter Credentials**: Go to the **Profile** page in AlphaPulse. Paste your 'API Key' and 'API Secret' into the respective fields and click 'Save'.
4. **Daily Access Token**: Zerodha requires a fresh login every day. Each morning, go to your Profile and click the **"Get Token"** button. This will redirect you to Zerodha to authorize the session for the day.

**Pro Tip**: Ensure your redirect URL in the Zerodha app settings matches your AlphaPulse URL (e.g., http://localhost:3000).`,
  },
  {
    id: "buy-sell",
    title: "Buy / Sell Shares",
    shortDescription: "Execute trades directly through the chat interface.",
    gradient: "from-emerald-500 to-green-600",
    icon: TrendingUp,
    image: "/tutorial/buy-sell.png",
    fullDescription: `Trading on AlphaPulse is as simple as chatting with a friend. You can execute Market and Limit orders using natural language.

**How to Trade:**
- **Market Order**: "Buy 10 shares of TATAMOTORS" or "Sell 50 shares of RELIANCE".
- **Limit Order**: "Buy 100 shares of INFY at 1450" (The AI will place a limit order at the specified price).
- **Confirmation**: The AI will always show you a confirmation card with the stock, quantity, price, and total value before placing the order. You must click "Confirm" to proceed.

**Safety First**: The AI checks your available funds and your personal 'Max Order Value' limit before allowing any trade.`,
  },
  {
    id: "holdings",
    title: "Get Holdings",
    shortDescription: "View your current portfolio and asset allocation.",
    gradient: "from-purple-500 to-violet-600",
    icon: PieChart,
    image: "/tutorial/holdings.png",
    fullDescription: `Keep track of your investments with a real-time portfolio view. You can access this via the Chat or the Dashboard.

**Chat Commands:**
- "Show my holdings"
- "What is my current portfolio value?"
- "List my open positions"

**Dashboard View:**
The Dashboard provides a visual breakdown of your assets.
- **Asset Allocation**: A pie chart showing your distribution across different sectors or stocks.
- **P&L Analysis**: See your total invested amount, current value, and overall Profit/Loss in real-time.
- **Day's Change**: Track how your portfolio is performing today vs. overall.`,
  },
  {
    id: "quote",
    title: "Get Quote",
    shortDescription: "Get real-time stock prices and market depth.",
    gradient: "from-cyan-500 to-blue-600",
    icon: Search,
    image: "/tutorial/quote.png",
    fullDescription: `Need to check the market before making a move? The AI can fetch live data for any stock listed on NSE/BSE.

**Chat Commands:**
- "Get quote for RELIANCE"
- "What is the price of TCS?"
- "Show me market depth for HDFCBANK"

**What You Get:**
- **Live Price**: The current trading price (LTP).
- **Change**: The absolute and percentage change from the previous close.
- **OHLC**: Open, High, Low, and Close prices for the day.
- **Volume**: Total shares traded today.
- **Market Depth**: Top 5 bids and asks (if available).`,
  },
  {
    id: "recommendations",
    title: "Get Recommendations",
    shortDescription: "Ask for bullish or bearish stock ideas.",
    gradient: "from-amber-500 to-orange-600",
    icon: Lightbulb,
    image: "/tutorial/recommendations.png",
    fullDescription: `Stuck on what to trade? Let the AI analyze the market for you. It scans for technical patterns and fundamental strength to suggest potential opportunities.

**Chat Commands:**
- "Recommend some bullish stocks for today"
- "Show me stocks with a bearish trend"
- "What are the top gainers right now?"

**How it Works:**
The AI looks for signals like Moving Average crossovers, RSI levels, and volume breakouts.
*Disclaimer: These are AI-generated suggestions based on data patterns and should not be taken as financial advice. Always do your own research.*`,
  },
  {
    id: "goals",
    title: "Setting Goals",
    shortDescription: "Plan your financial future with AI-assisted goal setting.",
    gradient: "from-rose-500 to-red-600",
    icon: Target,
    image: "/tutorial/goals.png",
    fullDescription: `Financial freedom starts with a plan. AlphaPulse helps you set, track, and achieve your financial milestones.

**How to Set a Goal:**
1. **Go to Goals Page**: Click on the 'Goals' tab in the navigation.
2. **Add New Goal**: Click "Create Goal" and enter details like "Buy a Car", Target Amount (e.g., ₹10,00,000), and Target Date.
3. **AI Analysis**: The AI will calculate the monthly savings (SIP) required to hit your target based on an expected return rate.

**Tracking:**
The dashboard shows a progress bar for each goal, letting you know if you are on track or need to increase your investments.`,
  },
  {
    id: "simulation",
    title: "Simulation Mode",
    shortDescription: "Practice trading strategies without risking real money.",
    gradient: "from-teal-500 to-emerald-600",
    icon: Gamepad2,
    image: "/tutorial/simulation.png",
    fullDescription: `New to trading? Or want to test a risky strategy? Use the Simulation Mode (Paper Trading) to practice without fear.

**Features:**
- **Virtual Capital**: You start with ₹10,00,000 in virtual cash.
- **Real Market Data**: Trades are executed at real-time market prices, just like the live market.
- **Performance Tracking**: Track your virtual P&L separately from your real portfolio.

**How to Use:**
Go to the **Simulation** page. You can place buy/sell orders exactly like you would in the real market. Use this to refine your skills before deploying real capital.`,
  },
  {
    id: "playground",
    title: "Algo Playground",
    shortDescription: "Design and backtest algorithmic trading strategies.",
    gradient: "from-fuchsia-500 to-pink-600",
    icon: FlaskConical,
    image: "/tutorial/playground.png",
    fullDescription: `For the advanced trader, the Playground offers a powerful environment to build and test automated strategies.

**What You Can Do:**
- **Backtesting**: Select a stock (e.g., SBIN), a strategy (e.g., SMA Crossover), and a date range. The system will simulate how that strategy would have performed in the past.
- **Visual Analysis**: View interactive charts showing buy/sell signals overlaid on price data.
- **Metrics**: Get detailed reports on Total Return, Win Rate, Max Drawdown, and Sharpe Ratio.

**Supported Strategies:**
- Simple Moving Average (SMA)
- Exponential Moving Average (EMA)
- RSI (Relative Strength Index)
- MACD (Moving Average Convergence Divergence)`,
  },
  {
    id: "leaderboard",
    title: "Leaderboard",
    shortDescription: "Compete with other traders and see where you rank.",
    gradient: "from-yellow-500 to-amber-600",
    icon: Trophy,
    image: "/tutorial/leaderboard.png",
    fullDescription: `Trading can be competitive! The Leaderboard ranks all AlphaPulse users based on their trading performance.

**Ranking Criteria:**
- **ROI (Return on Investment)**: The primary factor. Higher returns = higher rank.
- **Consistency**: Regular profitable trades score better than one lucky hit.
- **Risk Management**: Users with lower drawdowns may be ranked higher.

**Leagues:**
- **Global**: All users.
- **Weekly**: Top performers of the current week.
Check your rank daily and strive to reach the top 10!`,
  },
  {
    id: "bio-threshold",
    title: "Bio & Risk Threshold",
    shortDescription: "Personalize your profile and set safety limits.",
    gradient: "from-slate-500 to-gray-600",
    icon: UserCog,
    image: "/tutorial/bio-threshold.png",
    fullDescription: `AlphaPulse isn't just a tool; it's a personalized assistant. You can customize how it interacts with you and set safety boundaries.

**Risk Threshold (Max Order Value):**
In your **Profile**, set a limit (e.g., ₹50,000).
- If you try to place an order exceeding this value, the AI will **block** it and warn you.
- This prevents "fat-finger" errors and helps you stick to your risk management plan.

**Bio & Persona:**
Tell the AI about your style in the Bio section (e.g., "I am a conservative long-term investor"). The AI will tailor its recommendations and tone to match your personality.`,
  },
  {
    id: "whatsapp",
    title: "WhatsApp Integration",
    shortDescription: "Get trade updates and alerts directly on WhatsApp.",
    gradient: "from-green-500 to-teal-600",
    icon: MessageCircle,
    image: "/tutorial/whatsapp.jpg",
    fullDescription: `Never miss a market move, even when you're away from your screen. AlphaPulse can send critical updates directly to your WhatsApp.

**Features:**
- **Trade Confirmations**: Instant notification when an order is executed.
- **Price Alerts**: Get notified when a stock hits your target price.
- **Daily Summary**: A simplified P&L report sent after market close.

**Setup:**
1. Go to **Profile**.
2. Enter your phone number (with country code).
3. Verify the number (if OTP is required).
4. Toggle "Enable WhatsApp Alerts" to ON.`,
  },
];
