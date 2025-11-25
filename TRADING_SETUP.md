# Trading Bot Setup Guide

This chatbot supports trading functionality through Zerodha KiteConnect API. Follow these steps to enable trading features.

## Prerequisites

1. **Zerodha Account**: You need a Zerodha account with KiteConnect API access
2. **API Credentials**: Get your API Key and Secret from Zerodha
3. **Access Token**: Generate and refresh access tokens for API calls

## Setup Steps

### 1. Get KiteConnect API Credentials

1. Visit [KiteConnect Developer Portal](https://developers.kite.trade/)
2. Sign up and create a new app
3. Get your API Key and API Secret

### 2. Generate Access Token

1. Use the following flow to get your access token:

```python
from kiteconnect import KiteConnect

api_key = "your_api_key"
kite = KiteConnect(api_key=api_key)

# Print login URL
print(kite.login_url())

# Visit the URL in browser, login, and get request_token from redirect URL
request_token = "request_token_from_url"

# Generate access token
api_secret = "your_api_secret"
data = kite.generate_session(request_token, api_secret=api_secret)
access_token = data["access_token"]
```

### 3. Configure in Profile

1. Login to the chatbot application
2. Go to your Profile page
3. Enter:
   - **KiteConnect API Key**: Your API key
   - **KiteConnect API Secret**: Your API secret
   - **Access Token**: The generated access token
4. Save your profile

**Note**: Access tokens expire daily. You'll need to regenerate and update it regularly, or implement auto-refresh.

### 4. Start Trading!

Now you can use the chatbot to place orders and check holdings:

#### Place Orders

You can use natural language prompts like:

- "Place a buy order for one share of GTLINFRA on NSE MARKET CNC"
- "Buy 5 shares of RELIANCE on NSE"
- "Sell 2 shares of TCS on NSE MARKET CNC"

The system will automatically extract:

- Trading symbol (e.g., GTLINFRA, RELIANCE, TCS)
- Exchange (NSE or BSE)
- Transaction type (BUY or SELL)
- Quantity (number of shares)
- Order type (MARKET or LIMIT)
- Product type (CNC, MIS, or NRML)

#### Check Holdings

Ask to see your portfolio:

- "Show my holdings"
- "What stocks do I own?"
- "Display my portfolio"

## Security Notes

- Your API credentials are encrypted at rest
- Access tokens expire daily and need to be refreshed
- Always test in paper trading mode first
- Be careful with real money trading

## Error Handling

If you encounter errors:

1. **Credentials not configured**: Make sure you've set all three values in your profile
2. **Access token expired**: Regenerate and update your access token
3. **Invalid parameters**: Make sure you provide all required details (symbol, exchange, quantity, etc.)
4. **Market closed**: Orders can only be placed during market hours

## Example Prompts

Here are some example prompts to try:

```
Place a buy order for 1 share of GTLINFRA on NSE MARKET CNC
```

```
Sell 10 shares of RELIANCE on NSE MARKET
```

```
Show my holdings
```

```
Buy 5 shares of TCS on NSE
```

## Architecture

- **`kite_tools.py`**: Contains the trading functions (`place_order`, `get_holdings`)
- **`views.py`**: Contains the intent parser and chat integration
- **Intent Parsing**: Automatically detects trading-related prompts
- **Gemini Integration**: Formats responses in a user-friendly way

The system works by:

1. Detecting trading intent from user messages
2. Parsing parameters (symbol, exchange, quantity, etc.)
3. Calling KiteConnect API to execute trades
4. Using Gemini to format and explain the results

