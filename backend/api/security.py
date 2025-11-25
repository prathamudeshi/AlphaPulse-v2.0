from __future__ import annotations
from typing import Optional
from django.conf import settings

try:
    from cryptography.fernet import Fernet  # type: ignore
except Exception:  # pragma: no cover
    Fernet = None  # type: ignore

_fernet: Optional[Fernet] = None  # type: ignore

def _get_fernet() -> Optional["Fernet"]:
    global _fernet
    if _fernet is not None:
        return _fernet
    key = getattr(settings, 'ENCRYPTION_KEY', '') or ''
    if not key or Fernet is None:
        _fernet = None
        return None
    # ENCRYPTION_KEY should be a URL-safe base64-encoded 32-byte key
    try:
        _fernet = Fernet(key)
    except Exception:
        _fernet = None
    return _fernet


def encrypt_value(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    if value == "":
        return ""
    f = _get_fernet()
    if f is None:
        # Dev fallback: store as-is if crypto unavailable
        return value
    token = f.encrypt(value.encode("utf-8"))
    return token.decode("utf-8")


def decrypt_value(token: Optional[str]) -> Optional[str]:
    if token is None:
        return None
    if token == "":
        return ""
    f = _get_fernet()
    if f is None:
        # Dev fallback: values were stored as plain text
        return token
    try:
        value = f.decrypt(token.encode("utf-8")).decode("utf-8")
        return value
    except Exception:
        # If corruption or plain-text stored, return token as-is
        return token




