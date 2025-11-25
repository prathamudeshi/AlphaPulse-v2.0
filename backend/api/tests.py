from django.test import TestCase
from api.views import parse_trading_intent

# Create your tests here.

class TradingIntentParserTests(TestCase):
    """Test cases for trading intent parsing"""
    
    def test_parse_buy_order_with_all_details(self):
        """Test parsing a complete buy order request"""
        should_trade, tool_name, params = parse_trading_intent(
            "Place a buy order for one share of GTLINFRA on NSE MARKET CNC"
        )
        self.assertTrue(should_trade)
        self.assertEqual(tool_name, 'place_order')
        self.assertEqual(params['tradingsymbol'], 'GTLINFRA')
        self.assertEqual(params['exchange'], 'NSE')
        self.assertEqual(params['transaction_type'], 'BUY')
        self.assertEqual(params['quantity'], 1)
        self.assertEqual(params['order_type'], 'MARKET')
        self.assertEqual(params['product'], 'CNC')
    
    def test_parse_sell_order(self):
        """Test parsing a sell order request"""
        should_trade, tool_name, params = parse_trading_intent(
            "Sell 10 shares of RELIANCE on NSE"
        )
        self.assertTrue(should_trade)
        self.assertEqual(tool_name, 'place_order')
        self.assertEqual(params['tradingsymbol'], 'RELIANCE')
        self.assertEqual(params['exchange'], 'NSE')
        self.assertEqual(params['transaction_type'], 'SELL')
        self.assertEqual(params['quantity'], 10)
    
    def test_parse_holdings_request(self):
        """Test parsing a holdings request"""
        should_trade, tool_name, params = parse_trading_intent(
            "Show my holdings"
        )
        self.assertTrue(should_trade)
        self.assertEqual(tool_name, 'get_holdings')
        self.assertEqual(params, {})
    
    def test_parse_portfolio_request(self):
        """Test parsing a portfolio request"""
        should_trade, tool_name, params = parse_trading_intent(
            "What stocks do I own?"
        )
        self.assertTrue(should_trade)
        self.assertEqual(tool_name, 'get_holdings')
    
    def test_parse_no_trading_intent(self):
        """Test parsing a non-trading message"""
        should_trade, tool_name, params = parse_trading_intent(
            "What is the weather today?"
        )
        self.assertFalse(should_trade)
        self.assertEqual(tool_name, '')
        self.assertEqual(params, {})
    
    def test_parse_buy_with_word_number(self):
        """Test parsing buy order with word numbers"""
        should_trade, tool_name, params = parse_trading_intent(
            "Buy two shares of TCS on NSE"
        )
        self.assertTrue(should_trade)
        self.assertEqual(params['tradingsymbol'], 'TCS')
        self.assertEqual(params['quantity'], 2)
    
    def test_parse_order_without_all_details(self):
        """Test parsing an order without all required details"""
        should_trade, tool_name, params = parse_trading_intent(
            "Buy some shares"
        )
        # Should not trigger trading since missing required fields
        self.assertFalse(should_trade)
    
    def test_parse_order_with_quantity_number(self):
        """Test parsing order with numeric quantity"""
        should_trade, tool_name, params = parse_trading_intent(
            "Buy 5 stocks of INFY on NSE"
        )
        self.assertTrue(should_trade)
        self.assertEqual(params['quantity'], 5)
    
    def test_parse_order_with_bse_exchange(self):
        """Test parsing order with BSE exchange"""
        should_trade, tool_name, params = parse_trading_intent(
            "Buy 1 share of ZOMATO on BSE"
        )
        self.assertTrue(should_trade)
        self.assertEqual(params['exchange'], 'BSE')
    
    def test_parse_order_with_limit_type(self):
        """Test parsing order with limit order type"""
        should_trade, tool_name, params = parse_trading_intent(
            "Buy 10 shares of HDFC on NSE limit order"
        )
        self.assertTrue(should_trade)
        self.assertEqual(params['order_type'], 'LIMIT')
    
    def test_parse_order_with_mis_product(self):
        """Test parsing order with MIS product type"""
        should_trade, tool_name, params = parse_trading_intent(
            "Buy 5 shares of WIPRO on NSE MIS"
        )
        self.assertTrue(should_trade)
        self.assertEqual(params['product'], 'MIS')
    
    def test_parse_order_with_short_symbol(self):
        """Test parsing order with short trading symbol like TCS"""
        should_trade, tool_name, params = parse_trading_intent(
            "Buy 3 shares of TCS on NSE"
        )
        self.assertTrue(should_trade)
        self.assertEqual(params['tradingsymbol'], 'TCS')
        self.assertEqual(params['exchange'], 'NSE')
    
    def test_parse_order_multiple_numbers(self):
        """Test that quantity is correctly extracted when multiple numbers present"""
        should_trade, tool_name, params = parse_trading_intent(
            "Buy 25 shares of ICICIBANK on NSE"
        )
        self.assertTrue(should_trade)
        self.assertEqual(params['quantity'], 25)
