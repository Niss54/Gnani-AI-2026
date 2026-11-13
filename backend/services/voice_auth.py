"""Authenticate voice callers without trusting client-supplied tenant claims."""
import hmac
import json
import os

import httpx
from fastapi import HTTPException


def resolve_tenant(authorization=None, x_voice_internal_key=None, x_voice_tenant_id=None):
    if x_voice_internal_key:
        configured = os.getenv("VOICE_INTERNAL_API_KEY", "").strip()
        if not configured or not hmac.compare_digest(x_voice_internal_key, configured):
            raise HTTPException(401, "Invalid internal voice key")
        tenant = x_voice_tenant_id or os.getenv("VOICE_INTERNAL_TENANT_ID", "").strip()
        if not tenant:
            raise HTTPException(503, "Internal voice tenant is not configured")
        return tenant
    if not authorization or not authorization.startswith("Bearer ") or not authorization[7:].strip():
        raise HTTPException(401, "Voice authentication required")
    url = os.getenv("SUPABASE_URL", "").rstrip("/")
    key = os.getenv("SUPABASE_ANON_KEY", "")
    if not url.startswith("https://") or not key:
        raise HTTPException(503, "Voice identity provider is not configured")
    try:
        response = httpx.get(f"{url}/auth/v1/user", headers={"Authorization": authorization, "apikey": key}, timeout=5)
        if response.status_code in (401, 403):
            raise HTTPException(401, "Invalid voice access token")
        response.raise_for_status()
        user_id = response.json()["id"]
        # Server-managed mapping, never user_metadata or a browser header.
        mappings = json.loads(os.getenv("VOICE_USER_TENANTS", "{}"))
        tenant = mappings.get(user_id) if isinstance(mappings, dict) else None
    except (httpx.HTTPError, ValueError, KeyError, TypeError):
        raise HTTPException(503, "Voice identity verification unavailable") from None
    if not isinstance(tenant, str) or not tenant.strip():
        raise HTTPException(403, "No voice tenant membership")
    return tenant
