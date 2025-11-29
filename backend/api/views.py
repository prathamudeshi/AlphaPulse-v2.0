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
from django.http import StreamingHttpResponse, HttpResponse, JsonResponse
from .models import UserProfile, StockData, LeaderboardSnapshot, Goal, GoalItem
from django.db import transaction
from kiteconnect import KiteConnect
from . import kite_tools
from . import market_tools
from . import sim_tools
from .guardrails.safety import SafetyFilter
from twilio.twiml.messaging_response import MessagingResponse
from .backtester import BacktestEngine
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
            'phone_number': profile.phone_number or "",
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
            if 'phone_number' in data:
                profile.phone_number = data.get('phone_number') or ""
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
            'phone_number': profile.phone_number or "",
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
    files = request.FILES.getlist('files')
    
    if not user_text and not files:
        return Response({'detail': 'content or files required'}, status=400)
    
    convo = col.find_one({'_id': ObjectId(conversation_id), 'user_id': request.user.id})
    if not convo:
        return Response({'detail': 'Not found'}, status=404)

    def event_stream():
        now = datetime.datetime.utcnow()
        # Save the user message immediately
        # Note: We are not saving files to DB/S3 in this iteration, just passing to AI.
        # Ideally we should upload to S3/Cloudinary and save URL.
        # For now, we just indicate files were attached in the content if needed, or just save text.
        msg_content = user_text
        if files:
            msg_content += f"\n[Attached {len(files)} file(s)]"
            
        user_msg = {'role': 'user', 'content': msg_content, 'created_at': now}
        col.update_one({'_id': ObjectId(conversation_id)}, {'$push': {'messages': user_msg}, '$set': {'updated_at': now}})

        # Get conversation history (all previous messages)
        previous_messages = convo.get('messages', [])
        mode = convo.get('mode', 'real')

        # Use chat service
        from .chat_service import process_chat_message
        generator = process_chat_message(request.user, user_text, previous_messages, mode, files=files)
        
        full_response = ""
        for chunk in generator:
            if chunk == "data: [DONE]\n\n":
                continue
            yield chunk
            # Accumulate text content for saving
            if chunk.startswith("data: ") and not chunk.startswith("data: ["):
                content = chunk[6:].strip()
                full_response += content + " "

        # Persist assistant message
        if full_response:
            saved_at = datetime.datetime.utcnow()
            assistant_msg = {'role': 'assistant', 'content': full_response.strip(), 'created_at': saved_at}
            col.update_one(
                {'_id': ObjectId(conversation_id)},
                {'$push': {'messages': assistant_msg}, '$set': {'updated_at': saved_at}}
            )
            
            # Dynamic Title Generation
            # Check if title is default "New chat" and we have enough context
            try:
                # We need to fetch the fresh document to check the title, 
                # or rely on the fact that we haven't changed it in this request yet.
                # But to be safe and handle concurrent updates, let's fetch.
                current_convo = col.find_one({'_id': ObjectId(conversation_id)})
                if current_convo and current_convo.get('title') == 'New chat':
                    # Construct messages list for context
                    # previous_messages is already fetched at start
                    # user_msg is defined above
                    # assistant_msg is defined above
                    all_messages = previous_messages + [user_msg, assistant_msg]
                    
                    if len(all_messages) >= 2:
                        from .chat_service import generate_conversation_title
                        new_title = generate_conversation_title(all_messages)
                        if new_title:
                            col.update_one(
                                {'_id': ObjectId(conversation_id)},
                                {'$set': {'title': new_title}}
                            )
                            # Stream the new title to the client
                            yield f"data: [TITLE] {new_title}\n\n"
            except Exception as e:
                print(f"Error updating title: {e}")

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

    # Use chat service (non-streaming)
    from .chat_service import process_chat_message
    previous_messages = convo.get('messages', [])
    mode = convo.get('mode', 'real')
    
    generator = process_chat_message(request.user, user_text, previous_messages, mode)
    full_response = ""
    for chunk in generator:
        if chunk.startswith("data: ") and not chunk.startswith("data: [") and chunk != "data: [DONE]\n\n":
            content = chunk[6:].strip()
            full_response += content + " "
            
    ai_text = full_response.strip() if full_response else "I couldn't generate a response."
    
    ai_msg = {'role': 'assistant', 'content': ai_text, 'created_at': now}
    col.update_one(
        {'_id': ObjectId(conversation_id)},
        {'$push': {'messages': {'$each': [user_msg, ai_msg]}}, '$set': {'updated_at': now}}
    )
    
    # Dynamic Title Generation
    try:
        current_convo = col.find_one({'_id': ObjectId(conversation_id)})
        if current_convo and current_convo.get('title') == 'New chat':
            messages = current_convo.get('messages', [])
            if len(messages) >= 2:
                from .chat_service import generate_conversation_title
                new_title = generate_conversation_title(messages)
                if new_title:
                    col.update_one(
                        {'_id': ObjectId(conversation_id)},
                        {'$set': {'title': new_title}}
                    )
    except Exception as e:
        print(f"Error updating title: {e}")

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


import threading
from twilio.rest import Client

def process_whatsapp_message(user_id, incoming_msg, sender_phone):
    try:
        # Re-connect to DB in thread
        _, db = get_mongo()
        col = db['conversations']
        user = User.objects.get(id=user_id)
        
        # Find or create conversation
        convo = col.find_one({'user_id': user.id, 'title': 'WhatsApp Chat'})
        if not convo:
            now = datetime.datetime.utcnow()
            doc = {
                'title': 'WhatsApp Chat',
                'user_id': user.id,
                'mode': 'real',
                'created_at': now,
                'updated_at': now,
                'messages': [],
            }
            res = col.insert_one(doc)
            convo_id = res.inserted_id
            convo = doc
            convo['_id'] = convo_id
        else:
            convo_id = convo['_id']
            
        # Save user message
        now = datetime.datetime.utcnow()
        user_msg = {'role': 'user', 'content': incoming_msg, 'created_at': now}
        col.update_one({'_id': convo_id}, {'$push': {'messages': user_msg}, '$set': {'updated_at': now}})
        
        # Process with chat service
        from .chat_service import process_chat_message
        previous_messages = convo.get('messages', [])
        
        generator = process_chat_message(user, incoming_msg, previous_messages, mode='real')
        
        full_response = ""
        for chunk in generator:
            if chunk.startswith("data: ") and not chunk.startswith("data: [DONE]"):
                content = chunk[6:].strip()
                
                # Handle Structured Data Events
                if content.startswith("[HOLDINGS]"):
                    try:
                        json_str = content[10:].strip()
                        holdings = json.loads(json_str)
                        if not holdings:
                            full_response += "\nYou have no holdings.\n"
                        else:
                            table = "\n*Your Holdings:*\n"
                            for h in holdings:
                                symbol = h.get('tradingsymbol', 'Unknown')
                                qty = h.get('quantity', 0)
                                price = h.get('average_price', 0)
                                pnl = h.get('pnl', 0)
                                table += f"• *{symbol}*: {qty} qty @ {price:.2f} (P&L: {pnl:.2f})\n"
                            full_response += table
                    except Exception as e:
                        print(f"Error parsing holdings for WhatsApp: {e}")
                        full_response += "\n(Could not display holdings data)\n"
                        
                elif content.startswith("[STOCKS]"):
                    try:
                        json_str = content[8:].strip()
                        data = json.loads(json_str)
                        dtype = data.get('type')
                        
                        if dtype == 'single':
                            stock = data.get('data', {})
                            info = f"\n*{stock.get('symbol', 'Stock')}*\nPrice: {stock.get('current_price')}\nPE: {stock.get('pe_ratio')}\nMarket Cap: {stock.get('market_cap')}\n"
                            full_response += info
                            
                        elif dtype == 'list' or dtype == 'movers':
                            stocks = data.get('data', [])
                            title = data.get('title', 'Stocks')
                            table = f"\n*{title}*\n"
                            for s in stocks[:10]: # Limit to 10 for WhatsApp
                                table += f"• {s.get('symbol')} - {s.get('current_price')}\n"
                            full_response += table
                    except Exception as e:
                        print(f"Error parsing stocks for WhatsApp: {e}")
                        full_response += "\n(Could not display stock data)\n"
                
                else:
                    full_response += content + " "
        
        # Save assistant message
        if full_response:
            saved_at = datetime.datetime.utcnow()
            assistant_msg = {'role': 'assistant', 'content': full_response.strip(), 'created_at': saved_at}
            col.update_one(
                {'_id': convo_id},
                {'$push': {'messages': assistant_msg}, '$set': {'updated_at': saved_at}}
            )
            
            # Send response via Twilio API
            if settings.TWILIO_ACCOUNT_SID and settings.TWILIO_AUTH_TOKEN:
                client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
                client.messages.create(
                    from_=sender_phone if sender_phone.startswith('whatsapp:') else f'whatsapp:{settings.TWILIO_PHONE_NUMBER}',
                    body=full_response.strip(),
                    to=sender_phone
                )
            else:
                print("Twilio credentials not set, cannot send async response.")
                
    except Exception as e:
        print(f"Error processing WhatsApp message: {e}")


@csrf_exempt
def whatsapp_webhook(request):
    if request.method == 'POST':
        incoming_msg = request.POST.get('Body', '').strip()
        sender = request.POST.get('From', '') # e.g., whatsapp:+1234567890
        
        # Extract phone number
        phone_number = sender.replace('whatsapp:', '')
        
        # Find user
        profile = UserProfile.objects.filter(phone_number=phone_number).first()
        if not profile:
            resp = MessagingResponse()
            msg = resp.message()
            msg.body("Your phone number is not linked to any account. Please update your profile on the website.")
            return HttpResponse(str(resp))
            
        # Start background processing
        thread = threading.Thread(target=process_whatsapp_message, args=(profile.user.id, incoming_msg, sender))
        thread.start()
        
        # Return immediate success to avoid timeout
        return HttpResponse("Accepted", status=200)
        
    return HttpResponse("Only POST requests are allowed", status=405)

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
        for index, row in hist.iterrows():
            # Handle different column names from yfinance (Date vs Datetime)
            date_val = row.get('Date') or row.get('Datetime')
            if date_val:
                data.append({
                    'date': date_val.isoformat(),
                    'open': row['Open'],
                    'high': row['High'],
                    'low': row['Low'],
                    'close': row['Close'],
                    'volume': row['Volume']
                })
                
        return Response({'symbol': ticker_symbol, 'data': data})
        
    except Exception as e:
        return Response({'detail': str(e)}, status=500)


@api_view(['POST'])
@permission_classes([AllowAny])
def backtest_strategy(request):
    symbol = request.data.get('symbol', 'RELIANCE')
    strategy = request.data.get('strategy', 'sma')
    params = request.data.get('parameters', {})
    period = request.data.get('period', '1y')
    
    # Fetch Data
    try:
        if not symbol.endswith(".NS") and not symbol.endswith(".BO"):
            ticker_symbol = f"{symbol}.NS"
        else:
            ticker_symbol = symbol
            
        ticker = yf.Ticker(ticker_symbol)
        # Fetch enough data for indicators
        df = ticker.history(period=period)
        
        if df.empty:
             return Response({'detail': 'No data found'}, status=404)
             
        engine = BacktestEngine(df)
        
        if strategy == 'sma':
            short_window = int(params.get('short_window', 50))
            long_window = int(params.get('long_window', 200))
            results = engine.run_sma_strategy(short_window, long_window)
        elif strategy == 'rsi':
            period = int(params.get('period', 14))
            overbought = int(params.get('overbought', 70))
            oversold = int(params.get('oversold', 30))
            results = engine.run_rsi_strategy(period, overbought, oversold)
        else:
            return Response({'detail': 'Unknown strategy'}, status=400)
            
        return Response(results)
        
    except Exception as e:
        return Response({'detail': str(e)}, status=500)

@api_view(['POST'])
@permission_classes([AllowAny])
def analyze_playground(request):
    """
    Analyzes the backtest results using Gemini.
    """
    results = request.data.get('results')
    strategy_config = request.data.get('config')
    messages = request.data.get('messages', []) # List of {role, content}
    
    if not settings.GEMINI_API_KEY:
        return Response({'detail': 'Gemini API key not configured'}, status=500)
        
    try:
        import google.generativeai as genai
        genai.configure(api_key=settings.GEMINI_API_KEY)
        model = genai.GenerativeModel("gemini-2.5-flash")
        
        # Construct System Context
        system_context = f"""
        You are an expert algorithmic trading instructor in a "Playground" environment.
        
        CURRENT STRATEGY CONTEXT:
        Configuration: {json.dumps(strategy_config, indent=2)}
        Backtest Results: {json.dumps(results.get('metrics') if results else {}, indent=2)}
        
        YOUR ROLE:
        - Explain the performance educationaly.
        - If the user asks "Why did I lose money?", explain based on the strategy logic (e.g., "RSI is a mean reversion strategy, but the market was trending strongly...").
        - Suggest improvements (e.g., "Try increasing the window size to reduce noise").
        - Be concise, friendly, and encouraging.
        """
        
        # Build History for Gemini
        # Better approach for stateless API:
        # Construct history list for start_chat.
        
        gemini_history = []
        gemini_history.append({"role": "user", "parts": [system_context]})
        gemini_history.append({"role": "model", "parts": ["Understood. I am ready to help the user with their algorithmic trading strategy."]})
        
        for msg in messages[:-1]:
            role = "user" if msg.get('role') == 'user' else "model"
            gemini_history.append({"role": role, "parts": [msg.get('content', '')]})
            
        chat = model.start_chat(history=gemini_history)
        
        last_user_msg = messages[-1].get('content', '')
        response = chat.send_message(last_user_msg)
        
        text = getattr(response, 'text', None) or (response.candidates[0].content.parts[0].text if response.candidates else "No response")
        
        return Response({'analysis': text})
        
    except Exception as e:
        return Response({'detail': str(e)}, status=500)


@api_view(['GET'])
@permission_classes([AllowAny])
def get_leaderboard(request):
    metric = request.GET.get('metric', 'value') # value, balanced, consistency
    
    queryset = LeaderboardSnapshot.objects.select_related('user').all()
    
    if metric == 'value':
        queryset = queryset.order_by('-total_value')
    elif metric == 'balanced':
        queryset = queryset.order_by('-diversification_score')
    elif metric == 'consistency':
        queryset = queryset.order_by('-win_rate')
        
    # Calculate user rank if authenticated
    user_entry = None
    if request.user.is_authenticated:
        # Find user's position in the full sorted list
        for rank, entry in enumerate(queryset, 1):
            if entry.user.id == request.user.id:
                user_entry = {
                    'rank': rank,
                    'username': entry.user.username,
                    'total_value': entry.total_value,
                    'diversification_score': entry.diversification_score,
                    'win_rate': entry.win_rate,
                    'is_current_user': True
                }
                break
                
    data = []
    for rank, entry in enumerate(queryset[:50], 1):
        data.append({
            'rank': rank,
            'username': entry.user.username,
            'total_value': entry.total_value,
            'diversification_score': entry.diversification_score,
            'win_rate': entry.win_rate,
            'is_current_user': request.user.is_authenticated and entry.user.id == request.user.id
        })
        
    return JsonResponse({'leaderboard': data, 'user_entry': user_entry})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_goal_plan(request):
    target_amount = float(request.data.get('target_amount', 0))
    years = float(request.data.get('years', 3))
    risk_profile = request.data.get('risk_profile', 'balanced') # aggressive, balanced, conservative

    if target_amount <= 0:
        return Response({'detail': 'Invalid target amount'}, status=400)

    # 1. Calculate Monthly Contribution (PMT)
    # Assumptions: Aggressive=15%, Balanced=12%, Conservative=8%
    rates = {'aggressive': 0.15, 'balanced': 0.12, 'conservative': 0.08}
    rate = rates.get(risk_profile, 0.12)
    
    months = int(years * 12)
    r_monthly = rate / 12
    
    if r_monthly > 0:
        monthly_contribution = (target_amount * r_monthly) / ((1 + r_monthly)**months - 1)
    else:
        monthly_contribution = target_amount / months

    # 2. Generate Portfolio (Simple Heuristic for MVP)
    portfolio = []
    if risk_profile == 'aggressive':
        portfolio = [
            {'symbol': 'NIFTYBEES', 'allocation': 40, 'reason': 'Market Stability'},
            {'symbol': 'BANKBEES', 'allocation': 30, 'reason': 'High Growth Sector'},
            {'symbol': 'MIDCAP', 'allocation': 30, 'reason': 'Alpha Generation'}
        ]
    elif risk_profile == 'conservative':
        portfolio = [
            {'symbol': 'NIFTYBEES', 'allocation': 60, 'reason': 'Market Stability'},
            {'symbol': 'GOLDBEES', 'allocation': 20, 'reason': 'Hedge'},
            {'symbol': 'LIQUIDBEES', 'allocation': 20, 'reason': 'Safety'}
        ]
    else: # Balanced
        portfolio = [
            {'symbol': 'NIFTYBEES', 'allocation': 50, 'reason': 'Core Portfolio'},
            {'symbol': 'JUNIORBEES', 'allocation': 30, 'reason': 'Growth'},
            {'symbol': 'GOLDBEES', 'allocation': 20, 'reason': 'Stability'}
        ]

    return Response({
        'monthly_contribution': round(monthly_contribution, 2),
        'total_investment': round(monthly_contribution * months, 2),
        'estimated_returns': round(target_amount - (monthly_contribution * months), 2),
        'portfolio': portfolio,
        'message': f"To reach ₹{target_amount} in {years} years, you need to invest ₹{round(monthly_contribution)}/month."
    })

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_goal(request):
    name = request.data.get('name')
    target_amount = request.data.get('target_amount')
    deadline = request.data.get('deadline') # YYYY-MM-DD
    monthly_contribution = request.data.get('monthly_contribution')
    items = request.data.get('items', []) # List of {symbol, allocation}

    if not name or not target_amount or not deadline:
        return Response({'detail': 'Missing required fields'}, status=400)

    try:
        goal = Goal.objects.create(
            user=request.user,
            name=name,
            target_amount=target_amount,
            deadline=deadline,
            monthly_contribution=monthly_contribution or 0
        )
        
        for item in items:
            GoalItem.objects.create(
                goal=goal,
                symbol=item.get('symbol'),
                allocation=item.get('allocation')
            )
            
        return Response({'id': goal.id, 'message': 'Goal created successfully'})
    except Exception as e:
        return Response({'detail': str(e)}, status=500)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_goals(request):
    goals = Goal.objects.filter(user=request.user).prefetch_related('items')
    data = []
    for g in goals:
        # Calculate Status
        total_days = (g.deadline - g.created_at.date()).days
        days_passed = (datetime.date.today() - g.created_at.date()).days
        if total_days <= 0: total_days = 1
        
        progress_ratio = days_passed / total_days
        # Simple linear expectation for MVP
        expected_amount = float(g.target_amount) * progress_ratio
        
        status = "On Track"
        insight = "Keep it up!"
        
        if float(g.current_amount) < expected_amount * 0.9:
            status = "Behind"
            shortfall = expected_amount - float(g.current_amount)
            insight = f"You are falling behind. Invest ₹{round(shortfall)} more to get back on track."
        elif float(g.current_amount) > expected_amount * 1.1:
            status = "Ahead"
            insight = "You are ahead of schedule!"
            
        items = [{'symbol': i.symbol, 'allocation': i.allocation} for i in g.items.all()]
        
        data.append({
            'id': g.id,
            'name': g.name,
            'target_amount': g.target_amount,
            'current_amount': g.current_amount,
            'deadline': g.deadline,
            'monthly_contribution': g.monthly_contribution,
            'status': status,
            'insight': insight,
            'items': items
        })
    return Response(data)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def update_goal_progress(request, goal_id):
    try:
        goal = Goal.objects.get(id=goal_id, user=request.user)
        amount = request.data.get('amount')
        if amount is not None:
            goal.current_amount = amount
            goal.save()
        return Response({'message': 'Updated'})
    except Goal.DoesNotExist:
        return Response({'detail': 'Not found'}, status=404)

@api_view(['POST'])
@permission_classes([AllowAny])
def seed_leaderboard(request):
    """
    Dev tool to populate leaderboard with mock data
    """
    import random
    from django.contrib.auth.models import User
    
    # Create some mock users if they don't exist
    prefixes = ['Trader', 'Alpha', 'Bull', 'Bear', 'Crypto', 'Stock', 'Invest']
    suffixes = ['King', 'Queen', 'Master', 'Pro', 'Guru', 'Wizard', 'Ninja']
    
    for _ in range(20):
        username = f"{random.choice(prefixes)}{random.choice(suffixes)}{random.randint(1, 999)}"
        if not User.objects.filter(username=username).exists():
            user = User.objects.create_user(username=username, password='password123')
            
            # Create snapshot
            LeaderboardSnapshot.objects.create(
                user=user,
                total_value=random.uniform(800000, 5000000),
                diversification_score=random.uniform(20, 95),
                win_rate=random.uniform(30, 85)
            )
            
@api_view(['GET'])
@permission_classes([AllowAny])
def get_market_movers_view(request):
    """
    Get top gainers/losers for the dashboard
    """
    try:
        data = market_tools.get_market_movers()
        return Response(data)
    except Exception as e:
        return Response({'success': False, 'message': str(e)}, status=500)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_simulated_portfolio_view(request):
    """
    Get simulated holdings for the dashboard
    """
    try:
        data = sim_tools.get_simulated_holdings(request.user.id)
        return Response(data)
    except Exception as e:
        return Response({'success': False, 'message': str(e)}, status=500)
