from django.db import models
from django.conf import settings
from .security import encrypt_value, decrypt_value

class UserProfile(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='profile')
    kiteconnect_access_token = models.CharField(max_length=512, blank=True, null=True)
    kiteconnect_key_encrypted = models.TextField(blank=True, null=True)
    kiteconnect_secret_encrypted = models.TextField(blank=True, null=True)
    bio = models.TextField(blank=True, null=True, help_text='Tell us more about yourself')
    trade_threshold = models.FloatField(blank=True, null=True, help_text='Maximum value per trade')
    phone_number = models.CharField(max_length=20, blank=True, null=True, help_text='WhatsApp number with country code (e.g., +919876543210)')

    def __str__(self):
        return self.user.username

    @property
    def kiteconnect_key(self):
        return decrypt_value(self.kiteconnect_key_encrypted)

    @kiteconnect_key.setter
    def kiteconnect_key(self, value):
        self.kiteconnect_key_encrypted = encrypt_value(value)

    @property
    def kiteconnect_secret(self):
        return decrypt_value(self.kiteconnect_secret_encrypted)

    @kiteconnect_secret.setter
    def kiteconnect_secret(self, value):
        self.kiteconnect_secret_encrypted = encrypt_value(value)

class StockData(models.Model):
    symbol = models.CharField(max_length=20, unique=True, db_index=True)
    current_price = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)
    pe_ratio = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    market_cap = models.BigIntegerField(blank=True, null=True)
    fifty_two_week_high = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)
    fifty_two_week_low = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)
    volume = models.BigIntegerField(blank=True, null=True)
    sector = models.CharField(max_length=100, blank=True, null=True)
    last_updated = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.symbol

class LeaderboardSnapshot(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='leaderboard_stats')
    total_value = models.DecimalField(max_digits=15, decimal_places=2, default=1000000.00) # Start with 10L virtual cash
    diversification_score = models.FloatField(default=0.0, help_text="Score 0-100 based on sector spread")
    win_rate = models.FloatField(default=0.0, help_text="Percentage of profitable trades")
    last_updated = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.username} - ₹{self.total_value}"

class Goal(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='goals')
    name = models.CharField(max_length=255)
    target_amount = models.DecimalField(max_digits=15, decimal_places=2)
    deadline = models.DateField()
    monthly_contribution = models.DecimalField(max_digits=12, decimal_places=2, help_text="Required monthly investment")
    current_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0.0)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.user.username})"

class GoalItem(models.Model):
    goal = models.ForeignKey(Goal, on_delete=models.CASCADE, related_name='items')
    symbol = models.CharField(max_length=20)
    allocation = models.FloatField(help_text="Percentage allocation (0-100)")

    def __str__(self):
        return f"{self.symbol} - {self.allocation}%"
