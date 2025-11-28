from django.db import models
from django.conf import settings

class UserProfile(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='profile')
    kiteconnect_access_token = models.CharField(max_length=512, blank=True, null=True)
    kiteconnect_key_encrypted = models.TextField(blank=True, null=True)
    kiteconnect_secret_encrypted = models.TextField(blank=True, null=True)
    bio = models.TextField(blank=True, null=True, help_text='Tell us more about yourself')
    trade_threshold = models.FloatField(blank=True, null=True, help_text='Maximum value per trade')

    def __str__(self):
        return self.user.username

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
