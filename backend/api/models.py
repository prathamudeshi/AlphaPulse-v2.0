from django.contrib.auth.models import User
from django.db import models
from django.conf import settings

# Create your models here.

class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile")
    # Encrypted at rest
    kiteconnect_key_encrypted = models.TextField(null=True, blank=True)
    kiteconnect_secret_encrypted = models.TextField(null=True, blank=True)
    # Access token (can rotate often); keep as-is unless policy requires encryption too
    kiteconnect_access_token = models.CharField(max_length=512, null=True, blank=True)

    # New fields
    bio = models.TextField(null=True, blank=True, help_text="Tell us more about yourself")
    trade_threshold = models.FloatField(null=True, blank=True, help_text="Maximum value per trade")

    def __str__(self):
        return f"Profile of {self.user.username}"

    # Convenience properties for transparent access
    @property
    def kiteconnect_key(self):
        from .security import decrypt_value
        return decrypt_value(self.kiteconnect_key_encrypted)

    @kiteconnect_key.setter
    def kiteconnect_key(self, raw_value: str):
        from .security import encrypt_value
        self.kiteconnect_key_encrypted = encrypt_value(raw_value)

    @property
    def kiteconnect_secret(self):
        from .security import decrypt_value
        return decrypt_value(self.kiteconnect_secret_encrypted)

    @kiteconnect_secret.setter
    def kiteconnect_secret(self, raw_value: str):
        from .security import encrypt_value
        self.kiteconnect_secret_encrypted = encrypt_value(raw_value)
