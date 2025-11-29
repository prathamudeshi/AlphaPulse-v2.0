"""
Tools for Simulated Trading
"""
from typing import Dict, Any, List
from pymongo import MongoClient
from django.conf import settings
from . import market_tools
import datetime

def get_mongo_db():
    client = MongoClient(settings.MONGODB_URI)
    db = client[settings.MONGODB_DB]
    return db

def get_simulated_tools():
    """
    Define tools for Gemini Function Calling in Simulation Mode
    """
    return [
        {
            "function_declarations": [
                {
                    "name": "get_holdings",
                    "description": "Get the current user's SIMULATED stock holdings/portfolio.",
                    "parameters": {
                        "type": "OBJECT",
                        "properties": {},
                    }
                },
                {
                    "name": "place_order",
                    "description": "Place a SIMULATED buy or sell order for a stock.",
                    "parameters": {
                        "type": "OBJECT",
                        "properties": {
                            "tradingsymbol": {"type": "STRING", "description": "The stock symbol (e.g., RELIANCE, TCS, INFY)."},
                            "transaction_type": {"type": "STRING", "description": "BUY or SELL", "enum": ["BUY", "SELL"]},
                            "quantity": {"type": "INTEGER", "description": "Number of shares to buy/sell."},
                            "exchange": {"type": "STRING", "description": "Exchange (NSE or BSE). Default to NSE.", "enum": ["NSE", "BSE"]},
                            "order_type": {"type": "STRING", "description": "Order type (MARKET or LIMIT). Default MARKET.", "enum": ["MARKET", "LIMIT"]},
                            "price": {"type": "NUMBER", "description": "Limit price (required if order_type is LIMIT)."}
                        },
                        "required": ["tradingsymbol", "transaction_type", "quantity"]
                    }
                },
                {
                    "name": "get_stock_info",
                    "description": "Get real-time stock information (price, change, etc).",
                    "parameters": {
                        "type": "OBJECT",
                        "properties": {
                            "symbol": {"type": "STRING", "description": "The stock symbol (e.g., RELIANCE, TCS)."}
                        },
                        "required": ["symbol"]
                    }
                },
                {
                    "name": "get_market_movers",
                    "description": "Get top gainers, losers, or active stocks.",
                    "parameters": {
                        "type": "OBJECT",
                        "properties": {
                            "category": {"type": "STRING", "description": "Category: gainers, losers, or active-by-value.", "enum": ["gainers", "losers", "active-by-value"]}
                        },
                        "required": ["category"]
                    }
                },
                {
                    "name": "screen_stocks",
                    "description": "Find or recommend stocks based on a strategy.",
                    "parameters": {
                        "type": "OBJECT",
                        "properties": {
                            "strategy": {"type": "STRING", "description": "The strategy to use (bullish or bearish).", "enum": ["bullish", "bearish"]}
                        },
                        "required": ["strategy"]
                    }
                },
                {
                    "name": "get_stock_history",
                    "description": "Get historical stock data for analysis.",
                    "parameters": {
                        "type": "OBJECT",
                        "properties": {
                            "symbol": {"type": "STRING", "description": "The stock symbol (e.g., RELIANCE)."},
                            "period": {"type": "STRING", "description": "Time period (1d, 5d, 1mo, 3mo, 6mo, 1y, 5y). Default 1mo."}
                        },
                        "required": ["symbol"]
                    }
                },
                {
                    "name": "get_company_news",
                    "description": "Get recent news for a company.",
                    "parameters": {
                        "type": "OBJECT",
                        "properties": {
                            "symbol": {"type": "STRING", "description": "The stock symbol (e.g., RELIANCE)."}
                        },
                        "required": ["symbol"]
                    }
                }
            ]
        }
    ]

def place_simulated_order(user_id, tradingsymbol: str, transaction_type: str, quantity: int, price: float = 0, exchange: str = "NSE", order_type: str = "MARKET") -> Dict[str, Any]:
    """
    Place a simulated order
    """
    try:
        db = get_mongo_db()
        col = db['simulated_portfolios']
        
        # Normalize symbol
        symbol = tradingsymbol.upper()
        if not symbol.endswith('.NS') and not symbol.endswith('.BO'):
            symbol = f"{symbol}.NS" # Default to NSE
            
        # Get current price if MARKET order
        current_price = price
        if order_type == "MARKET" or not current_price:
            info = market_tools.get_stock_info(symbol)
            if not info.get('success'):
                return {"success": False, "message": f"Could not fetch price for {symbol}"}
            current_price = info.get('current_price')
            
        if not current_price:
             return {"success": False, "message": f"Could not determine price for {symbol}"}

        # Find user portfolio
        portfolio = col.find_one({"user_id": user_id})
        if not portfolio:
            portfolio = {"user_id": user_id, "holdings": {}, "cash": 1000000} # Start with 10L virtual cash
            
        holdings = portfolio.get("holdings", {})
        cash = portfolio.get("cash", 1000000)
        
        total_value = quantity * current_price
        
        if transaction_type == "BUY":
            if cash < total_value:
                return {"success": False, "message": f"Insufficient virtual cash. Required: {total_value:.2f}, Available: {cash:.2f}"}
            
            # Update holdings
            current_holding = holdings.get(symbol, {"quantity": 0, "average_price": 0})
            old_qty = current_holding["quantity"]
            old_avg = current_holding["average_price"]
            
            new_qty = old_qty + quantity
            new_avg = ((old_qty * old_avg) + (quantity * current_price)) / new_qty
            
            holdings[symbol] = {"quantity": new_qty, "average_price": new_avg}
            cash -= total_value
            
        elif transaction_type == "SELL":
            current_holding = holdings.get(symbol)
            if not current_holding or current_holding["quantity"] < quantity:
                return {"success": False, "message": f"Insufficient shares. You have {current_holding['quantity'] if current_holding else 0} shares."}
            
            new_qty = current_holding["quantity"] - quantity
            if new_qty == 0:
                del holdings[symbol]
            else:
                holdings[symbol]["quantity"] = new_qty
                # Average price doesn't change on sell
            
            cash += total_value
            
        # Save to DB
        col.update_one(
            {"user_id": user_id},
            {"$set": {"holdings": holdings, "cash": cash}},
            upsert=True
        )
        
        # Sync with Leaderboard
        try:
            update_leaderboard_snapshot(user_id, cash, holdings)
        except Exception as e:
            print(f"Failed to update leaderboard: {e}")
        
        return {
            "success": True, 
            "message": f"Simulated {transaction_type} order placed for {quantity} {symbol} at {current_price:.2f}",
            "details": {
                "symbol": symbol,
                "quantity": quantity,
                "price": current_price,
                "total_value": total_value,
                "remaining_cash": cash
            }
        }
        
    except Exception as e:
        return {"success": False, "message": f"Simulation error: {str(e)}"}

def update_leaderboard_snapshot(user_id, cash, holdings):
    """
    Updates the SQL LeaderboardSnapshot based on Mongo Portfolio
    """
    from .models import LeaderboardSnapshot, StockData
    from django.contrib.auth.models import User
    
    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return

    # Calculate Total Value
    total_value = cash
    unique_sectors = set()
    
    for symbol, data in holdings.items():
        qty = data['quantity']
        if qty > 0:
            # Get current price
            price = 0
            sector = "Unknown"
            
            # Try to get from StockData DB first (faster)
            stock_obj = StockData.objects.filter(symbol=symbol).first()
            if stock_obj:
                price = float(stock_obj.current_price or 0)
                sector = stock_obj.sector or "Unknown"
            else:
                # Fallback to live fetch
                info = market_tools.get_stock_info(symbol)
                price = info.get('current_price', 0)
                # We don't have sector in live fetch easily without extra API calls, 
                # so we might miss it if not in DB.
            
            total_value += (qty * price)
            if sector and sector != "Unknown":
                unique_sectors.add(sector)
            else:
                # If sector unknown, use symbol as proxy for diversification (weak proxy)
                unique_sectors.add(symbol)

    # Calculate Diversification Score (0-100)
    # Simple logic: 10 points per unique sector, max 100
    div_score = min(len(unique_sectors) * 10, 100)
    
    # Calculate Win Rate (Placeholder for now as we don't track closed trades history yet)
    # We'll use "Profitable Current Positions" as a proxy
    profitable_pos = 0
    total_pos = 0
    for symbol, data in holdings.items():
        qty = data['quantity']
        if qty > 0:
            avg = data['average_price']
            # Get price again (optimization: cache it above)
            # For now, just re-fetch or assume price is roughly same as above loop
            # Let's just use a simple heuristic if we don't want to re-fetch
            pass 
            
    # Update Snapshot
    snapshot, created = LeaderboardSnapshot.objects.get_or_create(user=user)
    snapshot.total_value = total_value
    snapshot.diversification_score = div_score
    # snapshot.win_rate = ... # Keep existing or update if we implement logic
    snapshot.save()

def get_simulated_holdings(user_id) -> Dict[str, Any]:
    """
    Get simulated holdings
    """
    try:
        db = get_mongo_db()
        col = db['simulated_portfolios']
        portfolio = col.find_one({"user_id": user_id})
        
        if not portfolio:
             return {"success": True, "holdings": [], "message": "No simulated holdings found. You have 1,000,000 virtual cash."}
             
        holdings_data = []
        holdings_dict = portfolio.get("holdings", {})
        
        for symbol, data in holdings_dict.items():
            # Fetch current price for P&L
            current_price = 0
            try:
                info = market_tools.get_stock_info(symbol)
                if info.get('success'):
                    current_price = info.get('current_price')
            except:
                pass
            
            qty = data['quantity']
            avg = data['average_price']
            value = qty * current_price if current_price else 0
            pnl = (current_price - avg) * qty if current_price else 0
            pnl_pct = (pnl / (qty * avg)) * 100 if (qty * avg) > 0 else 0
            
            holdings_data.append({
                "tradingsymbol": symbol,
                "quantity": qty,
                "average_price": round(avg, 2),
                "last_price": current_price,
                "pnl": round(pnl, 2),
                "pnl_percentage": round(pnl_pct, 2),
                "value": round(value, 2)
            })
            
        return {
            "success": True,
            "holdings": holdings_data,
            "cash": portfolio.get("cash"),
            "message": f"Retrieved {len(holdings_data)} simulated holdings"
        }
        
    except Exception as e:
        return {"success": False, "message": f"Error fetching simulated holdings: {str(e)}"}
