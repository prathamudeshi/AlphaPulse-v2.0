import pandas as pd
import numpy as np
from api.backtester import BacktestEngine

# Create mock data
dates = pd.date_range(start='2023-01-01', periods=300)
data = pd.DataFrame({
    'Open': np.random.rand(300) * 100,
    'High': np.random.rand(300) * 100,
    'Low': np.random.rand(300) * 100,
    'Close': np.linspace(100, 200, 300) + np.random.randn(300) * 5, # Upward trend
    'Volume': np.random.randint(1000, 10000, 300)
}, index=dates)

try:
    engine = BacktestEngine(data)
    print("Engine initialized.")
    
    results = engine.run_sma_strategy(short_window=10, long_window=50)
    print("SMA Strategy Run.")
    print("Total Return:", results['metrics']['total_return'])
    print("Trades:", len(results['trades']))
    
    results_rsi = engine.run_rsi_strategy()
    print("RSI Strategy Run.")
    print("Total Return:", results_rsi['metrics']['total_return'])
    
    print("SUCCESS")
except Exception as e:
    print(f"FAILED: {e}")
    import traceback
    traceback.print_exc()
