from django.urls import path
from . import views

urlpatterns = [
    path('auth/register/', views.register_user, name='register'),
    path('auth/login/', views.login_user, name='login'),
    path('auth/me/', views.me, name='me'),
    path('auth/profile/', views.user_profile, name='profile'),

    path('kite/exchange_token/', views.exchange_token, name='kite-exchange-token'),

    path('conversations/', views.list_conversations, name='conversations-list'),
    path('conversations/create/', views.create_conversation, name='conversations-create'),
    path('conversations/<str:conversation_id>/', views.get_conversation, name='conversations-get'),
    path('conversations/<str:conversation_id>/rename/', views.rename_conversation, name='conversations-rename'),
    path('conversations/<str:conversation_id>/delete/', views.delete_conversation, name='conversations-delete'),
    path('conversations/<str:conversation_id>/messages/', views.add_message, name='conversations-add-message'),
    path('conversations/<str:conversation_id>/stream/', views.stream_message, name='conversations-stream-message'),
    
    path('stocks/history/', views.get_stock_history, name='stock-history'),
]


