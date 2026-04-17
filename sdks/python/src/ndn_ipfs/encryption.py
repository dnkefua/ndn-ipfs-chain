"""Client-side AES-256-GCM envelope encryption."""
from __future__ import annotations

import base64
import os
import uuid
from dataclasses import dataclass
from typing import Optional

from cryptography.hazmat.primitives.ciphers.aead import AESGCM


@dataclass
class EncryptedPayload:
    ciphertext: bytes
    iv: str         # base64
    key_id: str
    algorithm: str = "AES-256-GCM"
    key: Optional[bytes] = None  # raw 32-byte key, returned on first encrypt only


def encrypt_bytes(
    plaintext: bytes,
    key: Optional[bytes] = None,
    key_id: Optional[str] = None,
    additional_data: Optional[bytes] = None,
) -> EncryptedPayload:
    """Encrypt plaintext with AES-256-GCM. Generates a fresh key when key is None."""
    k = key or AESGCM.generate_key(bit_length=256)
    iv = os.urandom(12)
    ct = AESGCM(k).encrypt(iv, plaintext, additional_data)
    return EncryptedPayload(
        ciphertext=ct,
        iv=base64.b64encode(iv).decode("ascii"),
        key_id=key_id or str(uuid.uuid4()),
        key=k if key is None else None,
    )


def decrypt_bytes(
    ciphertext: bytes,
    key: bytes,
    iv: str,
    additional_data: Optional[bytes] = None,
) -> bytes:
    return AESGCM(key).decrypt(base64.b64decode(iv), ciphertext, additional_data)
