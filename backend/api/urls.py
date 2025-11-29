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
    path('backtest_strategy/', views.backtest_strategy, name='backtest_strategy'),
    path('analyze_playground/', views.analyze_playground, name='analyze_playground'),
    path('leaderboard/', views.get_leaderboard, name='get_leaderboard'),
    path('leaderboard/seed/', views.seed_leaderboard, name='seed_leaderboard'),
    path('market/movers/', views.get_market_movers_view, name='get_market_movers'),
    path('simulation/portfolio/', views.get_simulated_portfolio_view, name='get_simulated_portfolio'),
    path('webhook/whatsapp/', views.whatsapp_webhook, name='whatsapp-webhook'),
    
    # Goals / Portfolio Architect
    path('goals/plan/', views.generate_goal_plan, name='generate_goal_plan'),
    path('goals/create/', views.create_goal, name='create_goal'),
    path('goals/', views.get_goals, name='get_goals'),
    path('goals/<int:goal_id>/progress/', views.update_goal_progress, name='update_goal_progress'),
]
