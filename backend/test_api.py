import requests
import json

url = "http://localhost:8000/api/backtest_strategy/"
payload = {
    "symbol": "RELIANCE",
    "strategy": "sma",
    "parameters": {"short_window": 50, "long_window": 200},
    "period": "1y"
}

try:
    response = requests.post(url, json=payload)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Error: {e}")
