import os
import django
from api import market_tools

def test_tools():
    print("Testing get_stock_info('RELIANCE')...")
    info = market_tools.get_stock_info('RELIANCE')
    print(info)
    
    print("\nTesting get_market_movers()...")
    movers = market_tools.get_market_movers()
    print(movers)
    
    print("\nTesting screen_stocks('bullish')...")
    screen = market_tools.screen_stocks('bullish')
    print(screen)

if __name__ == "__main__":
    test_tools()
