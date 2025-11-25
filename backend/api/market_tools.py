import yfinance as yf
import pandas as pd
from typing import Dict, Any, List

# Hardcoded Nifty 50 symbols for "market" context
NIFTY_50_SYMBOLS = [
    "ADANIENT", "ADANIPORTS", "APOLLOHOSP", "ASIANPAINT", "AXISBANK",
    "BAJAJ-AUTO", "BAJFINANCE", "BAJAJFINSV", "BEL", "BPCL",
    "BHARTIARTL", "BRITANNIA", "CIPLA", "COALINDIA", "DIVISLAB",
    "DRREDDY", "EICHERMOT", "GRASIM", "HCLTECH", "HDFCBANK",
    "HDFCLIFE", "HEROMOTOCO", "HINDALCO", "HINDUNILVR", "ICICIBANK",
    "ITC", "INDUSINDBK", "INFY", "JSWSTEEL", "KOTAKBANK",
    "LT", "M&M", "MARUTI", "NTPC", "NESTLEIND",
    "ONGC", "POWERGRID", "RELIANCE", "SBILIFE", "SBIN",
    "SUNPHARMA", "TCS", "TATACONSUM", "TATAMOTORS", "TATASTEEL",
    "TECHM", "TITAN", "ULTRACEMCO", "WIPRO"
]

def get_stock_info(symbol: str) -> Dict[str, Any]:
    """
    Get live (delayed) info for a stock.
    """
    try:
        # Append .NS if not present (assuming NSE)
        if not symbol.endswith(".NS") and not symbol.endswith(".BO"):
            ticker_symbol = f"{symbol}.NS"
        else:
            ticker_symbol = symbol
            
        ticker = yf.Ticker(ticker_symbol)
        info = ticker.info
        
        # Extract relevant fields
        return {
            "success": True,
            "symbol": symbol.upper(),
            "name": info.get("longName", symbol),
            "current_price": info.get("currentPrice") or info.get("regularMarketPrice"),
            "previous_close": info.get("previousClose"),
            "open": info.get("open"),
            "day_high": info.get("dayHigh"),
            "day_low": info.get("dayLow"),
            "market_cap": info.get("marketCap"),
            "pe_ratio": info.get("trailingPE"),
            "dividend_yield": info.get("dividendYield"),
            "52_week_high": info.get("fiftyTwoWeekHigh"),
            "52_week_low": info.get("fiftyTwoWeekLow"),
            "currency": info.get("currency", "INR"),
            "history_1d": []
        }
        
        # Fetch 1d history for initial chart
        try:
            hist = ticker.history(period="1d", interval="5m")
            if not hist.empty:
                # Reset index to get Datetime as a column
                hist = hist.reset_index()
                # Convert to list of dicts
                history_data = []
                for _, row in hist.iterrows():
                    history_data.append({
                        "time": row['Datetime'].isoformat(),
                        "value": round(row['Close'], 2)
                    })
                result["history_1d"] = history_data
        except Exception as e:
            print(f"Failed to fetch 1d history: {e}")
            
        return result
    except Exception as e:
        return {
            "success": False,
            "message": f"Failed to fetch info for {symbol}: {str(e)}"
        }

def get_market_movers() -> Dict[str, Any]:
    """
    Get top gainers and losers from Nifty 50.
    """
    try:
        # Download data for all Nifty 50 stocks for today
        tickers = [f"{s}.NS" for s in NIFTY_50_SYMBOLS]
        # Download last 2 days to calculate change if market is open/just opened
        data = yf.download(tickers, period="2d", progress=False)['Close']
        
        if data.empty:
             return {"success": False, "message": "No data available"}

        # Calculate % change
        # If we have 2 rows (yesterday and today/now), use pct_change
        # If only 1 row (market just opened or data issue), we might not get change easily without prev close
        
        if len(data) >= 2:
            # Calculate change from previous close
            current_prices = data.iloc[-1]
            prev_prices = data.iloc[-2]
            changes = ((current_prices - prev_prices) / prev_prices) * 100
        else:
            # Fallback: try to get prev close from info (too slow for 50 stocks)
            # Or just return what we have if possible. 
            # For now, let's assume we get at least some data.
            # If only 1 row, we can't calc change from history.
            return {"success": False, "message": "Insufficient data to calculate movers"}

        # Sort
        changes = changes.sort_values(ascending=False)
        
        top_gainers = []
        for sym, change in changes.head(5).items():
            clean_sym = sym.replace(".NS", "")
            top_gainers.append({"symbol": clean_sym, "change_pct": round(change, 2), "price": round(current_prices[sym], 2)})
            
        top_losers = []
        for sym, change in changes.tail(5).items():
            clean_sym = sym.replace(".NS", "")
            top_losers.append({"symbol": clean_sym, "change_pct": round(change, 2), "price": round(current_prices[sym], 2)})
            
        return {
            "success": True,
            "top_gainers": top_gainers,
            "top_losers": top_losers
        }
    except Exception as e:
        return {
            "success": False,
            "message": f"Failed to fetch market movers: {str(e)}"
        }

def screen_stocks(strategy: str) -> Dict[str, Any]:
    """
    Screen stocks based on simple strategies.
    Strategies: 'bullish', 'bearish'
    """
    try:
        tickers = [f"{s}.NS" for s in NIFTY_50_SYMBOLS]
        # Need enough history for SMA (e.g., 50 days)
        data = yf.download(tickers, period="3mo", progress=False)['Close']
        
        if data.empty:
            return {"success": False, "message": "No data available"}
            
        results = []
        
        # Calculate SMA 50
        sma50 = data.rolling(window=50).mean().iloc[-1]
        current_prices = data.iloc[-1]
        
        for ticker in tickers:
            if ticker not in sma50 or pd.isna(sma50[ticker]):
                continue
                
            price = current_prices[ticker]
            sma = sma50[ticker]
            clean_sym = ticker.replace(".NS", "")
            
            if strategy == "bullish":
                # Price > SMA 50
                if price > sma:
                    diff = ((price - sma) / sma) * 100
                    results.append({
                        "symbol": clean_sym,
                        "price": round(price, 2),
                        "signal": f"Above SMA50 by {diff:.1f}%"
                    })
            elif strategy == "bearish":
                # Price < SMA 50
                if price < sma:
                    diff = ((sma - price) / sma) * 100
                    results.append({
                        "symbol": clean_sym,
                        "price": round(price, 2),
                        "signal": f"Below SMA50 by {diff:.1f}%"
                    })
        
        # Sort by "strength" of signal (diff)
        # For bullish, higher diff is better? Or just list them.
        # Let's return top 10
        results.sort(key=lambda x: x['price'], reverse=True) # Just sorting by price for now, or maybe random
        
        return {
            "success": True,
            "strategy": strategy,
            "count": len(results),
            "stocks": results[:10] # Return top 10
        }
            
    except Exception as e:
        return {
            "success": False,
            "message": f"Failed to screen stocks: {str(e)}"
        }
