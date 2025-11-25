# Trading Bot Quick Reference

## Quick Start

1. **Setup**: Add your KiteConnect API Key, Secret, and Access Token in your profile
2. **Trade**: Use natural language commands in the chat
3. **Check**: Ask for holdings anytime

## Common Commands

### Place Buy Orders

```
Place a buy order for one share of GTLINFRA on NSE MARKET CNC
Buy 5 shares of RELIANCE on NSE
Buy 10 shares of TCS
```

### Place Sell Orders

```
Sell 2 shares of INFY on NSE
Sell 20 shares of HDFC on NSE MARKET CNC
```

### Check Holdings

```
Show my holdings
What stocks do I own?
Display my portfolio
```

### Normal Chat

```
What is the stock market?
How do I analyze stocks?
Explain P/E ratio
```

## Supported Parameters

| Parameter        | Options        | Default |
| ---------------- | -------------- | ------- |
| Exchange         | NSE, BSE       | -       |
| Transaction Type | BUY, SELL      | -       |
| Quantity         | Any number     | -       |
| Order Type       | MARKET, LIMIT  | MARKET  |
| Product Type     | CNC, MIS, NRML | CNC     |

## Trading Symbols

Stock symbols must be uppercase (minimum 3 characters):

- GTLINFRA ✅
- RELIANCE ✅
- TCS ✅
- INFY ✅

## Examples by Use Case

### Short-term Trading (MIS)

```
Buy 5 shares of WIPRO on NSE MIS
```

### Long-term Investment (CNC)

```
Buy 10 shares of RELIANCE on NSE CNC
```

### Limit Orders

```
Buy 15 shares of HDFC on NSE LIMIT order
```

### Quick Market Orders

```
Sell 25 shares of TCS on NSE
```

## Troubleshooting

**"Credentials not configured"**
→ Set API key, secret, and access token in profile

**"Missing required fields"**
→ Provide: symbol, exchange, quantity, and buy/sell

**Order fails**
→ Check if market is open
→ Verify sufficient funds
→ Check access token is valid

## Important Notes

⚠️ **Real Money Trading**: Be careful with live orders  
📅 **Access Tokens**: Refresh daily  
🔒 **Security**: Credentials are encrypted  
📊 **Market Hours**: 9:15 AM - 3:30 PM IST

## Need Help?

See full documentation:

- `TRADING_SETUP.md` - Complete setup guide
- `IMPLEMENTATION_SUMMARY.md` - Technical details

