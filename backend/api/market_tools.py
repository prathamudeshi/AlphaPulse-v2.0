import yfinance as yf
import pandas as pd
import datetime
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
        # Extract relevant fields
        result = {
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
                    # Handle different column names/types
                    ts = row.get('Datetime') or row.get('Date')
                    if ts:
                        history_data.append({
                            "time": ts.isoformat(),
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
        
        def clean_val(val):
            import math
            if pd.isna(val) or math.isnan(val) or math.isinf(val):
                return 0.0
            return round(float(val), 2)

        top_gainers = []
        for sym, change in changes.head(5).items():
            clean_sym = sym.replace(".NS", "")
            price = current_prices.get(sym, 0)
            top_gainers.append({
                "symbol": clean_sym, 
                "change_pct": clean_val(change), 
                "price": clean_val(price)
            })
            
        top_losers = []
        for sym, change in changes.tail(5).items():
            clean_sym = sym.replace(".NS", "")
            price = current_prices.get(sym, 0)
            top_losers.append({
                "symbol": clean_sym, 
                "change_pct": clean_val(change), 
                "price": clean_val(price)
            })
            
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

def get_stock_history(symbol: str, period: str = "1mo") -> Dict[str, Any]:
    """
    Get historical stock data for analysis.
    Period options: 1d, 5d, 1mo, 3mo, 6mo, 1y, 2y, 5y, 10y, ytd, max
    """
    try:
        # Append .NS if not present (assuming NSE)
        if not symbol.endswith(".NS") and not symbol.endswith(".BO"):
            ticker_symbol = f"{symbol}.NS"
        else:
            ticker_symbol = symbol
            
        ticker = yf.Ticker(ticker_symbol)
        # Fetch history
        hist = ticker.history(period=period)
        
        if hist.empty:
             return {"success": False, "message": f"No history found for {symbol}"}
             
        # Format for LLM analysis
        # We'll return a simplified list of daily closes/opens/highs/lows
        # Limit to last 30 points to avoid token limits if period is long, 
        # or maybe resample. For now, let's just take the last 30 rows if it's a long period.
        
        data = []
        for date, row in hist.tail(30).iterrows():
            data.append({
                "date": date.strftime('%Y-%m-%d'),
                "close": round(row['Close'], 2),
                "volume": int(row['Volume'])
            })
            
        return {
            "success": True,
            "symbol": symbol,
            "period": period,
            "data": data,
            "summary": f"Last {len(data)} trading sessions data provided."
        }
    except Exception as e:
        return {
            "success": False,
            "message": f"Failed to fetch history for {symbol}: {str(e)}"
        }

def get_company_news(symbol: str) -> Dict[str, Any]:
    """
    Get recent news for a company.
    """
    try:
        # Append .NS if not present (assuming NSE)
        if not symbol.endswith(".NS") and not symbol.endswith(".BO"):
            ticker_symbol = f"{symbol}.NS"
        else:
            ticker_symbol = symbol
            
        ticker = yf.Ticker(ticker_symbol)
        news = ticker.news
        
        formatted_news = []
        for item in news:
            formatted_news.append({
                "title": item.get('title'),
                "publisher": item.get('publisher'),
                "link": item.get('link'),
                "published": datetime.datetime.fromtimestamp(item.get('providerPublishTime', 0)).strftime('%Y-%m-%d %H:%M') if item.get('providerPublishTime') else "N/A"
            })
            
        return {
            "success": True,
            "symbol": symbol,
            "news": formatted_news[:5] # Top 5 news items
        }
    except Exception as e:
        return {
            "success": False,
            "message": f"Failed to fetch news for {symbol}: {str(e)}"
        }


def query_market_data(
    sector: str = None,
    min_price: float = None,
    max_price: float = None,
    min_pe: float = None,
    max_pe: float = None,
    min_market_cap: int = None,
    sort_by: str = "market_cap"
) -> Dict[str, Any]:
    """
    Query the local database for stocks matching criteria.
    Useful for screening stocks (e.g., "Find banks with PE < 20").
    """
    try:
        from .models import StockData
        from django.db.models import Q
        
        query = Q()
        
        if sector:
            query &= Q(sector__icontains=sector)
        if min_price is not None:
            query &= Q(current_price__gte=min_price)
        if max_price is not None:
            query &= Q(current_price__lte=max_price)
        if min_pe is not None:
            query &= Q(pe_ratio__gte=min_pe)
        if max_pe is not None:
            query &= Q(pe_ratio__lte=max_pe)
        if min_market_cap is not None:
            query &= Q(market_cap__gte=min_market_cap)
            
        # Validate sort_by
        valid_sorts = ["market_cap", "-market_cap", "pe_ratio", "-pe_ratio", "current_price", "-current_price", "volume", "-volume"]
        if sort_by not in valid_sorts:
            # Default to market cap desc if invalid
            sort_by = "-market_cap"
        elif not sort_by.startswith("-") and sort_by != "pe_ratio": 
            # Default to descending for most things except maybe PE
             sort_by = f"-{sort_by}"
             
        results = StockData.objects.filter(query).order_by(sort_by)[:10]
        
        data = []
        for stock in results:
            data.append({
                "symbol": stock.symbol,
                "price": float(stock.current_price) if stock.current_price else None,
                "pe": float(stock.pe_ratio) if stock.pe_ratio else None,
                "market_cap": stock.market_cap,
                "sector": stock.sector
            })
            
        return {
            "success": True,
            "count": len(data),
            "stocks": data
        }
    except Exception as e:
        return {
            "success": False,
            "message": f"Failed to query market data: {str(e)}"
        }
