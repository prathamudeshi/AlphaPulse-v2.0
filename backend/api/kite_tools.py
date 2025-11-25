"""
Trading tools for KiteConnect API integration
"""
from typing import Dict, Any, List
from kiteconnect import KiteConnect
from .models import UserProfile


def get_kite_client(user) -> KiteConnect:
    """Create and configure a KiteConnect client for the user"""
    profile = UserProfile.objects.get(user=user)
    
    if not profile.kiteconnect_key or not profile.kiteconnect_access_token:
        raise ValueError("KiteConnect credentials not configured. Please set your API key and access token in your profile.")
    
    kite = KiteConnect(api_key=profile.kiteconnect_key)
    kite.set_access_token(profile.kiteconnect_access_token)
    return kite


def place_order(user, tradingsymbol: str, exchange: str, transaction_type: str, quantity: int, order_type: str = "MARKET", product: str = "CNC") -> Dict[str, Any]:
    """
    Place an order on KiteConnect
    
    Args:
        user: Django user object
        tradingsymbol: Trading symbol (e.g., "GTLINFRA")
        exchange: Exchange code (e.g., "NSE", "BSE")
        transaction_type: BUY or SELL
        quantity: Number of shares
        order_type: MARKET, LIMIT, etc. (default: MARKET)
        product: CNC, MIS, NRML (default: CNC)
    
    Returns:
        Dictionary with order details or error message
    """
    try:
        kite = get_kite_client(user)
        
        # Place the order
        order_id = kite.place_order(
            tradingsymbol=tradingsymbol,
            exchange=exchange,
            transaction_type=transaction_type,
            quantity=quantity,
            order_type=order_type,
            product=product,
            variety='regular'
        )
        
        return {
            "success": True,
            "message": f"Order placed successfully",
            "order_id": order_id,
            "details": {
                "tradingsymbol": tradingsymbol,
                "exchange": exchange,
                "transaction_type": transaction_type,
                "quantity": quantity,
                "order_type": order_type,
                "product": product
            }
        }
    except Exception as e:
        return {
            "success": False,
            "message": f"Failed to place order: {str(e)}"
        }


def get_holdings(user) -> Dict[str, Any]:
    """
    Get user's current holdings
    
    Args:
        user: Django user object
    
    Returns:
        Dictionary with holdings or error message
    """
    try:
        kite = get_kite_client(user)
        holdings = kite.holdings()
        
        return {
            "success": True,
            "message": f"Retrieved {len(holdings)} holdings",
            "holdings": holdings
        }
    except Exception as e:
        return {
            "success": False,
            "message": f"Failed to get holdings: {str(e)}"
        }


