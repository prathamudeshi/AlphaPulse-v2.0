import pandas as pd
import numpy as np

class BacktestEngine:
    def __init__(self, data):
        """
        data: pd.DataFrame with columns ['Open', 'High', 'Low', 'Close', 'Volume']
              and datetime index.
        """
        self.data = data.copy()
        if self.data.empty:
            raise ValueError("Data is empty")

    def run_sma_strategy(self, short_window=50, long_window=200):
        """
        Simple Moving Average Crossover Strategy.
        Buy when Short SMA crosses above Long SMA.
        Sell when Short SMA crosses below Long SMA.
        """
        df = self.data.copy()
        
        # Calculate Indicators (Manual Pandas)
        df['SMA_Short'] = df['Close'].rolling(window=short_window).mean()
        df['SMA_Long'] = df['Close'].rolling(window=long_window).mean()
        
        # Generate Signals
        df['Signal'] = 0
        df.loc[df['SMA_Short'] > df['SMA_Long'], 'Signal'] = 1
        df.loc[df['SMA_Short'] < df['SMA_Long'], 'Signal'] = -1
        
        # Identify Crossovers (Trades)
        # 1 -> Buy, -1 -> Sell
        df['Position'] = df['Signal'].diff()
        
        return self._calculate_performance(df)

    def run_rsi_strategy(self, period=14, overbought=70, oversold=30):
        """
        RSI Mean Reversion Strategy.
        Buy when RSI crosses above Oversold (30).
        Sell when RSI crosses below Overbought (70).
        """
        df = self.data.copy()
        
        # Calculate RSI (Manual Pandas)
        delta = df['Close'].diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
        
        rs = gain / loss
        df['RSI'] = 100 - (100 / (1 + rs))
        
        # Generate Signals
        df['Signal'] = 0
        
        # We need to track state to hold position
        position = 0
        signals = []
        
        for i in range(len(df)):
            rsi = df['RSI'].iloc[i]
            if pd.isna(rsi):
                signals.append(0)
                continue
                
            if position == 0:
                if rsi < oversold:
                    position = 1
                    signals.append(1)
                else:
                    signals.append(0)
            elif position == 1:
                if rsi > overbought:
                    position = 0
                    signals.append(-1)
                else:
                    signals.append(0)
        
        df['Position'] = signals 
        
        return self._calculate_performance(df)

    def _calculate_performance(self, df):
        """
        Calculates returns, trades, and equity curve.
        Assumes 'Position' column contains 1 (Buy) and -1 (Sell) signals.
        """
        initial_capital = 100000
        cash = initial_capital
        holdings = 0
        
        equity_curve = []
        trades = []
        
        # Filter only rows with action
        actions = df[df['Position'] != 0]
        
        last_price = 0
        
        for date, row in df.iterrows():
            price = row['Close']
            action = row['Position']
            
            if action == 1: # Buy
                if cash > 0:
                    holdings = cash / price
                    cash = 0
                    trades.append({
                        'type': 'BUY',
                        'date': date,
                        'price': price
                    })
            elif action == -1: # Sell
                if holdings > 0:
                    cash = holdings * price
                    holdings = 0
                    trades.append({
                        'type': 'SELL',
                        'date': date,
                        'price': price
                    })
            
            current_equity = cash + (holdings * price)
            equity_curve.append({
                'date': date.strftime('%Y-%m-%d'),
                'equity': current_equity,
                'price': price
            })
            last_price = price

        final_equity = equity_curve[-1]['equity']
        total_return = ((final_equity - initial_capital) / initial_capital) * 100
        
        return {
            'equity_curve': equity_curve,
            'trades': trades,
            'metrics': {
                'total_return': round(total_return, 2),
                'final_equity': round(final_equity, 2),
                'total_trades': len(trades)
            }
        }
