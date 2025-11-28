from django.contrib.auth.models import User
from django.contrib.auth import authenticate
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from django.conf import settings
from pymongo import MongoClient
from bson import ObjectId
import os
import json
import yfinance as yf
import datetime
import re
from django.http import StreamingHttpResponse, HttpResponse
from .models import UserProfile
from django.db import transaction
from kiteconnect import KiteConnect
from . import kite_tools
from . import market_tools
from . import sim_tools
from .guardrails.safety import SafetyFilter

# Initialize safety filter globally to avoid reloading model
# This might take a moment on first load
try:
    safety_filter = SafetyFilter()
except Exception as e:
    print(f"Error initializing SafetyFilter: {e}")
    safety_filter = None



def get_mongo():
    client = MongoClient(settings.MONGODB_URI)
    db = client[settings.MONGODB_DB]
    return client, db


def user_payload(user: User):
    return {
        'id': user.id,
        'username': user.username,
        'email': user.email,
    }


def get_or_create_profile(user):
    profile, created = UserProfile.objects.get_or_create(user=user)
    return profile


@api_view(['POST'])
@permission_classes([AllowAny])
def register_user(request):
    username = request.data.get('username')
    email = request.data.get('email', '')
    password = request.data.get('password')
    if not username or not password:
        return Response({'detail': 'username and password required'}, status=400)
    if User.objects.filter(username=username).exists():
        return Response({'detail': 'username already exists'}, status=400)
    user = User.objects.create_user(username=username, email=email, password=password)
    UserProfile.objects.create(user=user) # ensure profile is created
    refresh = RefreshToken.for_user(user)
    return Response({
        'user': user_payload(user),
        'access': str(refresh.access_token),
        'refresh': str(refresh),
    })


@api_view(['POST'])
@permission_classes([AllowAny])
def login_user(request):
    username = request.data.get('username')
    password = request.data.get('password')
    user = authenticate(username=username, password=password)
    if not user:
        return Response({'detail': 'Invalid credentials'}, status=401)
    refresh = RefreshToken.for_user(user)
    return Response({
        'user': user_payload(user),
        'access': str(refresh.access_token),
        'refresh': str(refresh),
    })


@api_view(['GET'])
def me(request):
    return Response({'user': user_payload(request.user)})


@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def user_profile(request):
    user = request.user
    profile = get_or_create_profile(user)
    if request.method == 'GET':
        return Response({
            'username': user.username,
            'email': user.email,
            'kiteconnect_key': profile.kiteconnect_key or "",
            'kiteconnect_api_secret': profile.kiteconnect_secret or "",
            'kiteconnect_access_token': profile.kiteconnect_access_token or "",
            'bio': profile.bio or "",
            'trade_threshold': profile.trade_threshold,
        })
    elif request.method == 'PUT':
        data = request.data
        with transaction.atomic():
            user.email = data.get('email', user.email)
            user.save()
            if 'kiteconnect_key' in data and data.get('kiteconnect_key') is not None:
                profile.kiteconnect_key = data.get('kiteconnect_key') or ""
            if 'kiteconnect_api_secret' in data and data.get('kiteconnect_api_secret') is not None:
                profile.kiteconnect_secret = data.get('kiteconnect_api_secret') or ""
            if 'kiteconnect_access_token' in data and data.get('kiteconnect_access_token') is not None:
                profile.kiteconnect_access_token = data.get('kiteconnect_access_token') or ""
            if 'bio' in data:
                profile.bio = data.get('bio') or ""
            if 'trade_threshold' in data:
                try:
                    val = data.get('trade_threshold')
                    profile.trade_threshold = float(val) if val is not None and val != "" else None
                except (ValueError, TypeError):
                    pass # Ignore invalid float
            profile.save()
        return Response({
            'username': user.username,
            'email': user.email,
            'kiteconnect_key': profile.kiteconnect_key or "",
            'kiteconnect_api_secret': profile.kiteconnect_secret or "",
            'kiteconnect_access_token': profile.kiteconnect_access_token or "",
        })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def exchange_token(request):
    request_token = request.data.get('request_token')
    if not request_token:
        return Response({"detail": "Missing request_token"}, status=400)

    user = request.user
    profile = UserProfile.objects.filter(user=user).first() or UserProfile.objects.create(user=user)

    api_key = profile.kiteconnect_key
    api_secret = profile.kiteconnect_secret
    if not api_key or not api_secret:
        return Response({"detail": "Kite API key/secret not set in profile"}, status=400)

    kite = KiteConnect(api_key=api_key)
    try:
        data = kite.generate_session(request_token, api_secret=api_secret)
        access_token = data.get("access_token")
        profile.kiteconnect_access_token = access_token or ""
        profile.save()
        return Response({"access_token": access_token})
    except Exception as e:
        return Response({"detail": f"Failed to exchange token: {e}"}, status=500)


def conversation_doc_to_dto(doc):
    return {
        'id': str(doc.get('_id')),
        'title': doc.get('title'),
        'user_id': doc.get('user_id'),
        'created_at': doc.get('created_at'),
        'updated_at': doc.get('updated_at'),
        'messages': doc.get('messages', []),
        'mode': doc.get('mode', 'real'),
    }


@api_view(['GET'])
def list_conversations(request):
    _, db = get_mongo()
    col = db['conversations']
    user_id = request.user.id
    mode = request.query_params.get('mode', 'real')
    
    query = {'user_id': user_id}
    if mode == 'real':
        query['$or'] = [{'mode': 'real'}, {'mode': {'$exists': False}}]
    else:
        query['mode'] = mode
        
    docs = list(col.find(query).sort('updated_at', -1))
    return Response([conversation_doc_to_dto(d) for d in docs])


@api_view(['POST'])
def create_conversation(request):
    _, db = get_mongo()
    col = db['conversations']
    title = request.data.get('title') or 'New chat'
    mode = request.data.get('mode', 'real')
    now = datetime.datetime.utcnow()
    doc = {
        'title': title,
        'user_id': request.user.id,
        'mode': mode,
        'created_at': now,
        'updated_at': now,
        'messages': [],
    }
    result = col.insert_one(doc)
    doc['_id'] = result.inserted_id
    return Response(conversation_doc_to_dto(doc), status=201)


@api_view(['GET'])
def get_conversation(request, conversation_id: str):
    _, db = get_mongo()
    col = db['conversations']
    doc = col.find_one({'_id': ObjectId(conversation_id), 'user_id': request.user.id})
    if not doc:
        return Response({'detail': 'Not found'}, status=404)
    return Response(conversation_doc_to_dto(doc))


@api_view(['POST'])
def rename_conversation(request, conversation_id: str):
    _, db = get_mongo()
    col = db['conversations']
    title = request.data.get('title')
    if not title:
        return Response({'detail': 'title required'}, status=400)
    now = datetime.datetime.utcnow()
    res = col.find_one_and_update(
        {'_id': ObjectId(conversation_id), 'user_id': request.user.id},
        {'$set': {'title': title, 'updated_at': now}},
        return_document=True
    )
    if not res:
        return Response({'detail': 'Not found'}, status=404)
    return Response(conversation_doc_to_dto(res))


def generate_ai_reply(prompt: str) -> str:
    # Prefer Gemini if key is configured
    if settings.GEMINI_API_KEY:
        try:
            import google.generativeai as genai  # type: ignore
            genai.configure(api_key=settings.GEMINI_API_KEY)
            model = genai.GenerativeModel("gemini-2.5-flash")
            resp = model.generate_content(prompt)
            return getattr(resp, 'text', None) or (resp.candidates[0].content.parts[0].text if resp.candidates else "")
        except Exception as e:
            return f"AI error: {e}"
    # Fallback to OpenAI if available
    if settings.OPENAI_API_KEY:
        try:
            import openai  # type: ignore
            openai.api_key = settings.OPENAI_API_KEY
            completion = openai.ChatCompletion.create(
                model="gpt-3.5-turbo",
                messages=[{"role": "user", "content": prompt}],
            )
            return completion.choices[0].message["content"]
        except Exception as e:
            return f"AI error: {e}"
    return f"You said: {prompt}"


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

@api_view(['POST'])
def stream_message(request, conversation_id: str):
    # Server-Sent Events streaming of assistant reply
    _, db = get_mongo()
    col = db['conversations']
    user_text = request.data.get('content')
    if not user_text:
        return Response({'detail': 'content required'}, status=400)
    convo = col.find_one({'_id': ObjectId(conversation_id), 'user_id': request.user.id})
    if not convo:
        return Response({'detail': 'Not found'}, status=404)

    def event_stream():
        now = datetime.datetime.utcnow()
        # Save the user message immediately
        user_msg = {'role': 'user', 'content': user_text, 'created_at': now}
        col.update_one({'_id': ObjectId(conversation_id)}, {'$push': {'messages': user_msg}, '$set': {'updated_at': now}})

        # Get conversation history (all previous messages)
        previous_messages = convo.get('messages', [])
        mode = convo.get('mode', 'real')

        # Get user profile for bio
        profile = UserProfile.objects.filter(user=request.user).first()
        user_bio = profile.bio if profile else ""
        trade_threshold = profile.trade_threshold if profile else None

        system_instruction = "You are an educational trading assistant. Your goal is to help the user study market trends, understand financial concepts, and learn about trading algorithms. You have access to a local database of stock market data which you can query using the 'query_market_data' tool to find stocks based on sector, price, PE ratio, and market cap. Use this tool when the user asks to find, list, or screen for stocks (e.g., 'undervalued banks', 'large cap IT'). You can also provide technical analysis and news. Always state that your analysis is for educational purposes only and does not constitute financial advice. Explain your reasoning to help the user learn."
        if user_bio:
            system_instruction += f" The user has provided the following bio: '{user_bio}'. Adapt your persona and responses accordingly."
        
        # 1. Safety Check (Guardrails)
        if safety_filter:
            is_safe, safety_msg, risk_data = safety_filter.filter_query(user_text)
            if not is_safe:
                saved_at = datetime.datetime.utcnow()
                assistant_msg = {'role': 'assistant', 'content': safety_msg, 'created_at': saved_at}
                col.update_one(
                    {'_id': ObjectId(conversation_id)},
                    {'$push': {'messages': assistant_msg}, '$set': {'updated_at': saved_at}}
                )
                yield f"data: {safety_msg}\n\n"
                yield "data: [DONE]\n\n"
                return

        if settings.GEMINI_API_KEY:
            try:
                import google.generativeai as genai  # type: ignore
                from google.protobuf import struct_pb2 # type: ignore
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
                
                # Send message and handle function calls
                response = chat.send_message(user_text)
                
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
                                    
                            result = sim_tools.place_simulated_order(request.user.id, **args)
                            
                         elif tool_name == 'get_holdings':
                            result = sim_tools.get_simulated_holdings(request.user.id)
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
                                    # Note: The frontend expects 'history_1d' for the chart, but our tool returns 'data'. 
                                    # We might need to adjust frontend or backend to handle different periods.
                                    # For now, let's just send it as is, or map it if needed.
                                    # The frontend chart uses 'time' and 'value'. Our tool returns 'date', 'close'.
                                    # Let's map it here to match frontend expectation if possible, or update frontend.
                                    # Frontend expects: { time: string, value: number }
                                    chart_data = [{"time": d['date'], "value": d['close']} for d in result.get('data', [])]
                                    
                                    # We construct a payload that looks like what 'get_stock_info' returns for history
                                    # But we might want a specific event for history?
                                    # Or just let the LLM describe it.
                                    # Actually, let's just let the LLM describe it for now, 
                                    # but maybe send a [CHART] event if we want to be fancy later.
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
                                # We need to estimate order value.
                                # If it's a LIMIT order, we might have price.
                                # If MARKET, we need to fetch current price.
                                qty = args.get('quantity', 0)
                                price = args.get('price', 0) # Not in our tool def yet but might be passed?
                                
                                # If price is not known (Market order), fetch it
                                if not price:
                                    symbol = args.get('tradingsymbol')
                                    if symbol:
                                        # Quick fetch of price
                                        # We can use market_tools.get_stock_info or kite_tools.ltp if available
                                        # For now let's try market_tools.get_stock_info
                                        try:
                                            info = market_tools.get_stock_info(symbol=symbol)
                                            if info.get('success'):
                                                price = info.get('current_price', 0)
                                        except:
                                            pass
                                
                                estimated_value = qty * float(price) if price else 0
                                
                                # If we still don't have a price (e.g. failed fetch), we might warn or block.
                                # For safety, if we can't verify value, maybe block? Or allow with warning?
                                # Let's block if we have a valid price and it exceeds.
                                if price and estimated_value > trade_threshold:
                                    result = {"status": "error", "message": f"Order value ({estimated_value}) exceeds your configured threshold of {trade_threshold}."}
                                else:
                                    result = kite_tools.place_order(request.user, **args)
                            else:
                                result = kite_tools.place_order(request.user, **args)
                        elif tool_name == 'get_holdings':
                            result = kite_tools.get_holdings(request.user)
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
                    # We need to construct a FunctionResponse
                    function_response = {
                        "function_response": {
                            "name": tool_name,
                            "response": result
                        }
                    }
                    
                    # Send the function response to get the final natural language reply
                    final_response = chat.send_message(
                        [function_response]
                    )
                    
                    assistant_text = final_response.text
                    yield f"data: {assistant_text}\n\n"
                    
                else:
                    # No function call, just text
                    assistant_text = response.text
                    yield f"data: {assistant_text}\n\n"

                # Persist assistant message
                saved_at = datetime.datetime.utcnow()
                assistant_msg = {'role': 'assistant', 'content': assistant_text, 'created_at': saved_at}
                col.update_one(
                    {'_id': ObjectId(conversation_id)},
                    {'$push': {'messages': assistant_msg}, '$set': {'updated_at': saved_at}}
                )
                yield "data: [DONE]\n\n"
                
            except Exception as e:
                import traceback
                print(traceback.format_exc())
                err_text = f"AI error: {str(e)}"
                saved_at = datetime.datetime.utcnow()
                assistant_msg = {'role': 'assistant', 'content': err_text, 'created_at': saved_at}
                col.update_one(
                    {'_id': ObjectId(conversation_id)},
                    {'$push': {'messages': assistant_msg}, '$set': {'updated_at': saved_at}}
                )
                yield f"data: {err_text}\n\n"
                yield "data: [DONE]\n\n"
        else:
            # Fallback if no key
            text = "Gemini API key not configured."
            yield f"data: {text}\n\n"
            yield "data: [DONE]\n\n"

    response = StreamingHttpResponse(event_stream(), content_type='text/event-stream')
    response['Cache-Control'] = 'no-cache'
    response['X-Accel-Buffering'] = 'no'
    return response


@api_view(['POST'])
def add_message(request, conversation_id: str):
    _, db = get_mongo()
    col = db['conversations']
    user_text = request.data.get('content')
    if not user_text:
        return Response({'detail': 'content required'}, status=400)
    now = datetime.datetime.utcnow()
    convo = col.find_one({'_id': ObjectId(conversation_id), 'user_id': request.user.id})
    if not convo:
        return Response({'detail': 'Not found'}, status=404)
    user_msg = {'role': 'user', 'content': user_text, 'created_at': now}
    
    # Safety Check
    if safety_filter:
        is_safe, safety_msg, _ = safety_filter.filter_query(user_text)
        if not is_safe:
            ai_msg = {'role': 'assistant', 'content': safety_msg, 'created_at': now}
            col.update_one(
                {'_id': ObjectId(conversation_id)},
                {'$push': {'messages': {'$each': [user_msg, ai_msg]}}, '$set': {'updated_at': now}}
            )
            updated = col.find_one({'_id': ObjectId(conversation_id)})
            return Response(conversation_doc_to_dto(updated))

    ai_text = generate_ai_reply(user_text)
    ai_msg = {'role': 'assistant', 'content': ai_text, 'created_at': now}
    col.update_one(
        {'_id': ObjectId(conversation_id)},
        {'$push': {'messages': {'$each': [user_msg, ai_msg]}}, '$set': {'updated_at': now}}
    )
    updated = col.find_one({'_id': ObjectId(conversation_id)})
    return Response(conversation_doc_to_dto(updated))


@api_view(['DELETE'])
def delete_conversation(request, conversation_id: str):
    _, db = get_mongo()
    col = db['conversations']
    res = col.delete_one({'_id': ObjectId(conversation_id), 'user_id': request.user.id})
    if res.deleted_count == 0:
        return Response({'detail': 'Not found'}, status=404)
    return Response(status=204)

from django.shortcuts import render

@api_view(['GET'])
@permission_classes([AllowAny])
def get_stock_history(request):
    symbol = request.query_params.get('symbol')
    period = request.query_params.get('period', '1d')
    
    if not symbol:
        return Response({'detail': 'symbol required'}, status=400)
        
    # Map period to interval
    interval_map = {
        '1d': '5m',
        '5d': '15m',
        '1mo': '1h',
        '6mo': '1d',
        '1y': '1d',
        '5y': '1d',
        'max': '1d'
    }
    interval = interval_map.get(period, '1d')
    
    try:
        # Append .NS if not present (assuming NSE)
        if not symbol.endswith(".NS") and not symbol.endswith(".BO"):
            ticker_symbol = f"{symbol}.NS"
        else:
            ticker_symbol = symbol
            
        ticker = yf.Ticker(ticker_symbol)
        hist = ticker.history(period=period, interval=interval)
        
        if hist.empty:
             return Response([])
             
        # Reset index to get Datetime/Date as a column
        hist = hist.reset_index()
        
        data = []
        for _, row in hist.iterrows():
            # Check if we have Datetime or Date
            if 'Datetime' in row:
                time_val = row['Datetime'].isoformat()
            elif 'Date' in row:
                time_val = row['Date'].isoformat()
            else:
                continue
                
            data.append({
                "time": time_val,
                "value": round(row['Close'], 2)
            })
            
        return Response(data)
        
    except Exception as e:
        return Response({'detail': str(e)}, status=500)

