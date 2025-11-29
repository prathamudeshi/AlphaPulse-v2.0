import datetime
import json
from django.conf import settings
from .models import UserProfile
from . import kite_tools
from . import market_tools
from . import sim_tools
from .guardrails.safety import SafetyFilter

# Initialize safety filter globally
try:
    safety_filter = SafetyFilter()
except Exception as e:
    print(f"Error initializing SafetyFilter: {e}")
    safety_filter = None

def get_gemini_tools():
    """
    Define tools for Gemini Function Calling
    """
    return [
        {
            "function_declarations": [
                {
                    "name": "get_holdings",
                    "description": "Get the current user's stock holdings/portfolio.",
                    "parameters": {
                        "type": "OBJECT",
                        "properties": {},
                    }
                },
                {
                    "name": "place_order",
                    "description": "Place a buy or sell order for a stock.",
                    "parameters": {
                        "type": "OBJECT",
                        "properties": {
                            "tradingsymbol": {"type": "STRING", "description": "The stock symbol (e.g., RELIANCE, TCS)."},
                            "exchange": {"type": "STRING", "description": "The exchange (NSE or BSE).", "enum": ["NSE", "BSE"]},
                            "transaction_type": {"type": "STRING", "description": "BUY or SELL.", "enum": ["BUY", "SELL"]},
                            "quantity": {"type": "INTEGER", "description": "Number of shares to trade."},
                            "product": {"type": "STRING", "description": "Product type (CNC for delivery, MIS for intraday).", "enum": ["CNC", "MIS", "NRML"]},
                            "order_type": {"type": "STRING", "description": "Order type (MARKET or LIMIT).", "enum": ["MARKET", "LIMIT"]}
                        },
                        "required": ["tradingsymbol", "exchange", "transaction_type", "quantity"]
                    }
                },
                {
                    "name": "get_stock_info",
                    "description": "Get live price and fundamentals for a specific stock.",
                    "parameters": {
                        "type": "OBJECT",
                        "properties": {
                            "symbol": {"type": "STRING", "description": "The stock symbol (e.g., RELIANCE)."}
                        },
                        "required": ["symbol"]
                    }
                },
                {
                    "name": "get_market_movers",
                    "description": "Get top gaining and losing stocks in the market (Nifty 50).",
                    "parameters": {
                        "type": "OBJECT",
                        "properties": {},
                    }
                },
                {
                    "name": "screen_stocks",
                    "description": "Find or recommend stocks based on a strategy (bullish/bearish). Use this when user asks for recommendations or ideas.",
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
                },
                {
                    "name": "query_market_data",
                    "description": "Query/Screen the stock market database for stocks matching specific criteria (sector, price, PE, market cap). Use this for broad questions like 'Find cheap banks' or 'Stocks with high market cap'.",
                    "parameters": {
                        "type": "OBJECT",
                        "properties": {
                            "sector": {"type": "STRING", "description": "Sector to filter by (e.g., 'Bank', 'IT', 'Energy')."},
                            "min_price": {"type": "NUMBER", "description": "Minimum price."},
                            "max_price": {"type": "NUMBER", "description": "Maximum price."},
                            "min_pe": {"type": "NUMBER", "description": "Minimum PE ratio."},
                            "max_pe": {"type": "NUMBER", "description": "Maximum PE ratio."},
                            "min_market_cap": {"type": "INTEGER", "description": "Minimum market cap."},
                            "sort_by": {"type": "STRING", "description": "Field to sort by (market_cap, pe_ratio, current_price). Default is market_cap."}
                        },
                        "required": []
                    }
                }
            ]
        }
    ]

import io
from PIL import Image
import pypdf

def process_chat_message(user, user_text, previous_messages=None, mode='real', files=None):
    """
    Process a chat message using Gemini, executing tools if needed.
    Returns a generator that yields chunks of the response (or events).
    """
    if previous_messages is None:
        previous_messages = []
    if files is None:
        files = []

    # Get user profile for bio
    profile = UserProfile.objects.filter(user=user).first()
    user_bio = profile.bio if profile else ""
    trade_threshold = profile.trade_threshold if profile else None

    system_instruction = "You are a personalized trading assistant. You have full permission to access the user's portfolio (holdings), place orders, and fetch market data on their behalf using the provided tools. Do not refuse these requests based on privacy; the user has authenticated and authorized this. Your goal is to help the user study market trends, understand financial concepts, and learn about trading algorithms. You have access to a local database of stock market data which you can query using the 'query_market_data' tool to find stocks based on sector, price, PE ratio, and market cap. Use this tool when the user asks to find, list, or screen for stocks (e.g., 'undervalued banks', 'large cap IT'). You can also provide technical analysis and news. Always state that your analysis is for educational purposes only and does not constitute financial advice. Explain your reasoning to help the user learn."
    if user_bio:
        system_instruction += f" The user has provided the following bio: '{user_bio}'. Adapt your persona and responses accordingly."
    
    # 1. Safety Check (Guardrails)
    if safety_filter:
        # Note: Safety filter currently only checks text.
        is_safe, safety_msg, risk_data = safety_filter.filter_query(user_text)
        if not is_safe:
            yield f"data: {safety_msg}\n\n"
            yield "data: [DONE]\n\n"
            return

    if settings.GEMINI_API_KEY:
        try:
            import google.generativeai as genai  # type: ignore
            genai.configure(api_key=settings.GEMINI_API_KEY)
            
            # Initialize model with tools
            if mode == 'simulation':
                tools = sim_tools.get_simulated_tools()
            else:
                tools = get_gemini_tools()
                
            model = genai.GenerativeModel("gemini-2.5-flash", tools=tools, system_instruction=system_instruction)
            
            # Build history
            history = []
            for msg in previous_messages:
                role = "user" if msg.get('role') == 'user' else "model"
                content = msg.get('content', '')
                if content:
                    history.append({
                        "role": role,
                        "parts": [content]
                    })
            
            chat = model.start_chat(history=history) if history else model.start_chat()
            
            # Prepare message parts
            message_parts = []
            if user_text:
                message_parts.append(user_text)
                
            for file in files:
                try:
                    # Check content type
                    content_type = getattr(file, 'content_type', '')
                    if content_type.startswith('image/'):
                        img = Image.open(file)
                        message_parts.append(img)
                    elif content_type == 'application/pdf':
                        try:
                            pdf_reader = pypdf.PdfReader(file)
                            text_content = ""
                            for page in pdf_reader.pages:
                                text_content += page.extract_text() + "\n"
                            message_parts.append(f"\n[File: {file.name} (PDF Content)]\n{text_content}\n")
                        except Exception as e:
                            print(f"Error reading PDF {file.name}: {e}")
                            message_parts.append(f"\n[Error reading PDF {file.name}]\n")
                    elif content_type.startswith('text/') or content_type == 'application/json':
                        text_content = file.read().decode('utf-8')
                        message_parts.append(f"\n[File: {file.name}]\n{text_content}\n")
                    else:
                        # Try to read as text for code files etc.
                        try:
                            text_content = file.read().decode('utf-8')
                            message_parts.append(f"\n[File: {file.name}]\n{text_content}\n")
                        except:
                            message_parts.append(f"\n[File: {file.name}] (Unsupported format)\n")
                except Exception as e:
                    print(f"Error processing file {file.name}: {e}")
                    message_parts.append(f"\n[Error processing file {file.name}]\n")

            if not message_parts:
                message_parts.append(" ") # Empty message if only files failed

            # Send message and handle function calls
            response = chat.send_message(message_parts)
            
            # Check for function call
            part = response.candidates[0].content.parts[0]
            
            if part.function_call:
                fc = part.function_call
                tool_name = fc.name
                args = {k: v for k, v in fc.args.items()}
                
                result = {}
                # Execute tool
                if mode == 'simulation':
                     if tool_name == 'place_order':
                        # Ensure quantity is int
                        if 'quantity' in args:
                            try:
                                args['quantity'] = int(args['quantity'])
                            except: pass
                        # Uppercase enums
                        for key in ['transaction_type', 'exchange', 'order_type']:
                            if key in args and isinstance(args[key], str):
                                args[key] = args[key].upper()
                                
                        result = sim_tools.place_simulated_order(user.id, **args)
                        
                     elif tool_name == 'get_holdings':
                        result = sim_tools.get_simulated_holdings(user.id)
                        if result.get('success'):
                            try:
                                holdings_json = json.dumps(result.get('holdings', []), default=str)
                                yield f"data: [HOLDINGS] {holdings_json}\n\n"
                            except Exception as e:
                                print(f"Error serializing sim holdings: {e}")
                                
                     elif tool_name == 'get_stock_info':
                        # Same as real
                        result = market_tools.get_stock_info(**args)
                        if result.get('success'):
                            try:
                                payload = {"type": "single", "data": result}
                                stocks_json = json.dumps(payload, default=str)
                                yield f"data: [STOCKS] {stocks_json}\n\n"
                            except: pass
                            
                     elif tool_name == 'get_market_movers':
                        # Same as real
                        result = market_tools.get_market_movers()
                        if result.get('success'):
                            try:
                                payload = {"type": "movers", "data": result}
                                stocks_json = json.dumps(payload, default=str)
                                yield f"data: [STOCKS] {stocks_json}\n\n"
                            except: pass
                            
                     elif tool_name == 'screen_stocks':
                        # Same as real
                        result = market_tools.screen_stocks(**args)
                        if result.get('success'):
                            try:
                                payload = {"type": "list", "title": f"{args.get('strategy', 'Stock').capitalize()} Stocks", "data": result.get('stocks', [])}
                                stocks_json = json.dumps(payload, default=str)
                                yield f"data: [STOCKS] {stocks_json}\n\n"
                            except: pass
                            
                     elif tool_name == 'get_stock_history':
                        result = market_tools.get_stock_history(**args)
                        if result.get('success'):
                            try:
                                # Send chart data to frontend
                                payload = {"type": "single", "data": {"symbol": result.get('symbol'), "history_1d": result.get('data')}}
                                pass
                            except: pass
                            
                     elif tool_name == 'get_company_news':
                        result = market_tools.get_company_news(**args)
                        
                     elif tool_name == 'query_market_data':
                        result = market_tools.query_market_data(**args)
                        if result.get('success'):
                            try:
                                payload = {
                                    "type": "list",
                                    "title": "Market Query Results",
                                    "data": result.get('stocks', [])
                                }
                                stocks_json = json.dumps(payload, default=str)
                                yield f"data: [STOCKS] {stocks_json}\n\n"
                            except Exception as e:
                                print(f"Error serializing query results: {e}")
                     else:
                        result = {"error": f"Unknown tool: {tool_name}"}

                else:
                    # REAL MODE
                    if tool_name == 'place_order':
                        # Ensure quantity is an integer
                        if 'quantity' in args:
                            try:
                                args['quantity'] = int(args['quantity'])
                            except (ValueError, TypeError):
                                pass  # Let downstream handle it if it's really broken

                        # Ensure enums are uppercase
                        for key in ['transaction_type', 'exchange', 'product', 'order_type']:
                            if key in args and isinstance(args[key], str):
                                args[key] = args[key].upper()

                        # Check Threshold
                        if trade_threshold is not None:
                            qty = args.get('quantity', 0)
                            price = args.get('price', 0) 
                            
                            if not price:
                                symbol = args.get('tradingsymbol')
                                if symbol:
                                    try:
                                        info = market_tools.get_stock_info(symbol=symbol)
                                        if info.get('success'):
                                            price = info.get('current_price', 0)
                                    except:
                                        pass
                            
                            estimated_value = qty * float(price) if price else 0
                            
                            if price and estimated_value > trade_threshold:
                                result = {"status": "error", "message": f"Order value ({estimated_value}) exceeds your configured threshold of {trade_threshold}."}
                            else:
                                result = kite_tools.place_order(user, **args)
                        else:
                            result = kite_tools.place_order(user, **args)
                    elif tool_name == 'get_holdings':
                        result = kite_tools.get_holdings(user)
                        if result.get('success'):
                            try:
                                holdings_json = json.dumps(result.get('holdings', []), default=str)
                                yield f"data: [HOLDINGS] {holdings_json}\n\n"
                            except Exception as e:
                                print(f"Error serializing holdings: {e}")
                    elif tool_name == 'get_stock_info':
                        result = market_tools.get_stock_info(**args)
                        if result.get('success'):
                            try:
                                payload = {
                                    "type": "single",
                                    "data": result
                                }
                                stocks_json = json.dumps(payload, default=str)
                                yield f"data: [STOCKS] {stocks_json}\n\n"
                            except Exception as e:
                                print(f"Error serializing stock info: {e}")
                    elif tool_name == 'get_market_movers':
                        result = market_tools.get_market_movers()
                        if result.get('success'):
                            try:
                                payload = {
                                    "type": "movers",
                                    "data": result
                                }
                                stocks_json = json.dumps(payload, default=str)
                                yield f"data: [STOCKS] {stocks_json}\n\n"
                            except Exception as e:
                                print(f"Error serializing movers: {e}")
                    elif tool_name == 'screen_stocks':
                        result = market_tools.screen_stocks(**args)
                        if result.get('success'):
                            try:
                                payload = {
                                    "type": "list",
                                    "title": f"{args.get('strategy', 'Stock').capitalize()} Stocks",
                                    "data": result.get('stocks', [])
                                }
                                stocks_json = json.dumps(payload, default=str)
                                yield f"data: [STOCKS] {stocks_json}\n\n"
                            except Exception as e:
                                print(f"Error serializing screened stocks: {e}")
                    elif tool_name == 'query_market_data':
                        result = market_tools.query_market_data(**args)
                        if result.get('success'):
                            try:
                                payload = {
                                    "type": "list",
                                    "title": "Market Query Results",
                                    "data": result.get('stocks', [])
                                }
                                stocks_json = json.dumps(payload, default=str)
                                yield f"data: [STOCKS] {stocks_json}\n\n"
                            except Exception as e:
                                print(f"Error serializing query results: {e}")
                    else:
                        result = {"error": f"Unknown tool: {tool_name}"}
                    
                # Send result back to model
                function_response = {
                    "function_response": {
                        "name": tool_name,
                        "response": result
                    }
                }
                
                final_response = chat.send_message(
                    [function_response]
                )
                
                assistant_text = final_response.text
                yield f"data: {assistant_text}\n\n"
                
            else:
                # No function call, just text
                assistant_text = response.text
                yield f"data: {assistant_text}\n\n"

            yield "data: [DONE]\n\n"
            
        except Exception as e:
            import traceback
            print(f"DEBUG: Exception in stream: {e}")
            print(traceback.format_exc())
            err_text = f"AI error: {str(e)}"
            yield f"data: {err_text}\n\n"
            yield "data: [DONE]\n\n"
    else:
        # Fallback if no key
        text = "Gemini API key not configured."
        yield f"data: {text}\n\n"
        yield "data: [DONE]\n\n"


def generate_conversation_title(messages):
    """
    Generates a short, relevant title for a conversation based on its messages.
    """
    if not settings.GEMINI_API_KEY:
        return None

    try:
        import google.generativeai as genai
        genai.configure(api_key=settings.GEMINI_API_KEY)
        model = genai.GenerativeModel("gemini-2.5-flash")

        # Construct a simple prompt
        conversation_text = ""
        for msg in messages[:4]: # Use first few messages for context
            role = "User" if msg.get('role') == 'user' else "AI"
            content = msg.get('content', '')
            conversation_text += f"{role}: {content}\n"

        prompt = f"""
        Generate a very short, concise title (3-5 words max) for this conversation.
        Do not use quotes. Do not be chatty. Just the title.
        
        Conversation:
        {conversation_text}
        
        Title:
        """
        
        response = model.generate_content(prompt)
        title = getattr(response, 'text', None) or (response.candidates[0].content.parts[0].text if response.candidates else "")
        return title.strip()
    except Exception as e:
        print(f"Error generating title: {e}")
        return None
