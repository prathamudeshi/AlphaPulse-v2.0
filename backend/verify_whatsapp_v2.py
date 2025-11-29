import os
import django
import sys
from django.test import RequestFactory
from unittest.mock import MagicMock, patch

# Setup Django
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'server.settings')
django.setup()

from api.views import whatsapp_webhook
from api.models import UserProfile
from django.contrib.auth.models import User
from api.views import get_mongo

def test_whatsapp_webhook():
    print("Setting up test user...")
    # Create or get user
    username = "whatsapp_test_user"
    phone = "+1234567890"
    user, created = User.objects.get_or_create(username=username)
    if created:
        user.set_password("password")
        user.save()
    
    # Update profile
    profile, _ = UserProfile.objects.get_or_create(user=user)
    profile.phone_number = phone
    profile.save()
    print(f"User {username} linked with phone {phone}")

    # Mock request
    factory = RequestFactory()
    data = {
        'Body': 'Hello, tell me about reliance stocks',
        'From': f'whatsapp:{phone}'
    }
    request = factory.post('/webhook/whatsapp/', data)
    
    # Mock Gemini and Twilio
    with patch('api.chat_service.process_chat_message') as mock_process, \
         patch('api.views.Client') as MockTwilioClient:
        
        # Mock generator response
        def mock_generator(*args, **kwargs):
            yield "data: [HOLDINGS] [{\"tradingsymbol\": \"RELIANCE\", \"quantity\": 10, \"average_price\": 2500.0, \"pnl\": 500.0}]\n\n"
            yield "data: [DONE]\n\n"
        
        mock_process.side_effect = mock_generator
        
        # Mock Twilio Client instance
        mock_client_instance = MockTwilioClient.return_value
        mock_messages = mock_client_instance.messages
        
        print("Sending mock webhook request...")
        response = whatsapp_webhook(request)
        
        print(f"Response Status: {response.status_code}")
        print(f"Response Content: {response.content.decode()}")
        
        if response.status_code == 200 and response.content.decode() == "Accepted":
            print("SUCCESS: Webhook returned immediate 200 OK.")
        else:
            print("FAILURE: Webhook did not return immediate success.")
            
        # Wait for thread to complete (simple join won't work easily here as we don't have handle)
        # But since we are mocking, the thread might run fast. 
        # In a real unit test we'd join the thread. Here we sleep briefly.
        import time
        time.sleep(1)
        
        # Verify Twilio call
        if mock_messages.create.called:
            args, kwargs = mock_messages.create.call_args
            body = kwargs.get('body', '')
            to = kwargs.get('to', '')
            print(f"Twilio Message Sent to {to}: {body}")
            
            if "RELIANCE" in body and "Your Holdings" in body:
                print("SUCCESS: Async response sent via Twilio.")
            else:
                print("FAILURE: Async response content incorrect.")
        else:
            print("FAILURE: Twilio messages.create was NOT called.")

    # Verify MongoDB
    print("Verifying MongoDB conversation...")
    _, db = get_mongo()
    col = db['conversations']
    convo = col.find_one({'user_id': user.id, 'title': 'WhatsApp Chat'})
    
    if convo:
        print(f"Found conversation: {convo['_id']}")
        messages = convo.get('messages', [])
        print(f"Message count: {len(messages)}")
        if len(messages) >= 2: # User + Assistant
            print("SUCCESS: Conversation persisted in MongoDB.")
        else:
            print("WARNING: Less than 2 messages found.")
    else:
        print("FAILURE: No conversation found in MongoDB.")

if __name__ == "__main__":
    test_whatsapp_webhook()
