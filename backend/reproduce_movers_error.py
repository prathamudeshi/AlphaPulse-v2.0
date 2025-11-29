import os
import django
import sys

# Setup Django environment
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'server.settings')
django.setup()

from api.market_tools import get_market_movers

print("Calling get_market_movers()...")
try:
    result = get_market_movers()
    print("Result:", result)
except Exception as e:
    print("Exception caught:", e)
    import traceback
    traceback.print_exc()
