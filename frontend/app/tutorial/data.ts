
export interface HelpItem {
  id: string;
  title: string;
  shortDescription: string;
  fullDescription: React.ReactNode;
  image: string;
}

export const helpItems: HelpItem[] = [
  {
    id: "api-setup",
    title: "Setting up API Key",
    shortDescription: "Connect your Zerodha Kite account to enable trading features.",
    image: "/tutorial/api-setup.png",
    fullDescription: "To start trading, you need to link your Zerodha Kite account. Go to the Profile section and enter your Kite Connect API Key and Secret. This is a one-time setup. You will also need to generate a daily access token using the 'Get Token' button every morning before trading.",
  },
  {
    id: "buy-sell",
    title: "Buy / Sell Shares",
    shortDescription: "Execute trades directly through the chat interface.",
    image: "/tutorial/buy-sell.png",
    fullDescription: "You can buy or sell shares by simply telling the AI. For example, type 'Buy 1 share of TATAMOTORS' or 'Sell 5 shares of RELIANCE'. The AI will confirm the order details with you before placing it. Make sure you have sufficient funds and the market is open.",
  },
  {
    id: "holdings",
    title: "Get Holdings",
    shortDescription: "View your current portfolio and asset allocation.",
    image: "/tutorial/holdings-view.png", // Using the existing one or the new one
    fullDescription: "Ask the AI to 'Show my holdings' or 'Get portfolio' to see a list of all stocks you currently own. You can also view a visual breakdown of your portfolio in the Dashboard.",
  },
  {
    id: "quote",
    title: "Get Quote",
    shortDescription: "Get real-time stock prices and market depth.",
    image: "/tutorial/quote.png",
    fullDescription: "Need the current price of a stock? Just ask! Type 'Get quote for RELIANCE' or 'What is the price of INFY?'. The AI will fetch the latest live data from the market.",
  },
  {
    id: "recommendations",
    title: "Get Recommendations",
    shortDescription: "Ask for bullish or bearish stock ideas.",
    image: "/tutorial/recommendations.png",
    fullDescription: "Not sure what to trade? Ask the AI for recommendations. You can say 'Recommend some bullish stocks' or 'Show me bearish trends'. The AI analyzes market data to suggest potential opportunities.",
  },
  {
    id: "goals",
    title: "Setting Goals",
    shortDescription: "Plan your financial future with AI-assisted goal setting.",
    image: "/tutorial/goals.png",
    fullDescription: "You can set financial goals through the chat or the Goals page. Tell the AI 'I want to save for a car' or 'Plan for my retirement'. It will help you create a personalized investment plan to reach your targets.",
  },
  {
    id: "simulation",
    title: "Simulation Mode",
    shortDescription: "Practice trading strategies without risking real money.",
    image: "/tutorial/simulation.png",
    fullDescription: "Use the Simulation mode to test your strategies with virtual money. It mirrors real market conditions, allowing you to learn and experiment safely before trading with actual capital.",
  },
  {
    id: "playground",
    title: "Algo Playground",
    shortDescription: "Design and backtest algorithmic trading strategies.",
    image: "/tutorial/playground.png",
    fullDescription: "The Playground is a powerful tool for algorithmic traders. You can create, test, and refine automated trading strategies using historical data. Visualize performance and optimize your algorithms.",
  },
  {
    id: "leaderboard",
    title: "Leaderboard",
    shortDescription: "Compete with other traders and see where you rank.",
    image: "/tutorial/leaderboard.png",
    fullDescription: "Check the Leaderboard to see the top performing traders. Scores are calculated based on overall portfolio returns and consistency. Compete to improve your rank and prove your trading skills!",
  },
  {
    id: "bio-threshold",
    title: "Bio & Risk Threshold",
    shortDescription: "Personalize your profile and set safety limits.",
    image: "/tutorial/bio-threshold.png",
    fullDescription: "In your Profile, you can set a 'Max Order Value' threshold. This acts as a safety guardrail—the AI will warn you or block orders that exceed this amount. You can also update your Bio to personalize your profile.",
  },
  {
    id: "whatsapp",
    title: "WhatsApp Integration",
    shortDescription: "Get trade updates and alerts directly on WhatsApp.",
    image: "/tutorial/api-setup.png", // Fallback image
    fullDescription: "Stay connected even when you're away from the screen. Enable WhatsApp integration in your Profile to receive instant trade confirmations, alerts, and daily summaries directly to your WhatsApp number.",
  },
];
