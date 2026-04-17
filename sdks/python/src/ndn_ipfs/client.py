"""NDN IPFS Chain Python client — sync + async."""
from __future__ import annotations

import json
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Any, BinaryIO, Iterable, Literal, Optional, Union

import httpx
from pydantic import BaseModel, Field

from .encryption import encrypt_bytes, EncryptedPayload

Region = Literal[
    "us-east-1", "us-west-2",
    "eu-west-1", "eu-central-1",
    "ap-southeast-1", "ap-northeast-1",
    "sa-east-1",
]

PinStatus = Literal["queued", "pinning", "pinned", "failed"]


class PinOptions(BaseModel):
    name: Optional[str] = None
    region: Optional[Region] = None
    replication: int = 3
    encryption: bool = False
    lifecycle: Optional[str] = None
    meta: dict[str, str] = Field(default_factory=dict)


class Pin(BaseModel):
    id: str
    cid: str
    name: Optional[str] = None
    status: PinStatus
    created: datetime
    size: Optional[int] = None
    replicas: list[str] = Field(default_factory=list)


class LifecycleRule(BaseModel):
    action: Literal["move-to-warm", "move-to-cold", "move-to-filecoin", "delete", "reduce-replication"]
    afterDays: Optional[int] = None
    ifNotAccessedFor: Optional[int] = None
    if_: Optional[str] = Field(default=None, alias="if")


class NDNError(Exception):
    def __init__(self, status: int, message: str, body: Any = None) -> None:
        super().__init__(message)
        self.status = status
        self.body = body


@dataclass
class NDNClient:
    """NDN IPFS Chain client.

    Example:
        >>> from ndn_ipfs import NDNClient
        >>> ipfs = NDNClient(api_key="ndn_live_...")
        >>> pin = ipfs.pin(b"hello, ipfs", name="hello.txt")
        >>> print(pin.cid)
    """

    api_key: Optional[str] = None
    jwt: Optional[str] = None
    base_url: str = "https://api.ndnipfs.com/v1"
    gateway_url: str = "https://gateway.ndnipfs.link"
    region: Optional[Region] = None
    timeout: float = 60.0
    _http: httpx.Client = field(init=False)

    def __post_init__(self) -> None:
        self._http = httpx.Client(base_url=self.base_url, timeout=self.timeout, headers=self._auth_headers())

    def _auth_headers(self) -> dict[str, str]:
        if self.api_key:
            return {"X-API-Key": self.api_key}
        if self.jwt:
            return {"Authorization": f"Bearer {self.jwt}"}
        return {}

    # ---------- Pins ----------

    def pin(
        self,
        data: Union[bytes, str, Path, BinaryIO],
        opts: Optional[PinOptions] = None,
    ) -> Pin:
        """Upload + pin anything: bytes, str, Path, or file-like."""
        opts = (opts or PinOptions()).model_copy(update={"region": opts.region if opts and opts.region else self.region})
        payload, filename = _normalize_payload(data, opts.name)

        if opts.encryption:
            enc = encrypt_bytes(payload)
            payload = enc.ciphertext
            opts.meta = {**opts.meta, "iv": enc.iv, "keyId": enc.key_id}

        files = {"file": (filename, payload)}
        form: dict[str, Any] = {"replication": str(opts.replication), "encryption": str(opts.encryption).lower()}
        if opts.name:      form["name"] = opts.name
        if opts.region:    form["region"] = opts.region
        if opts.lifecycle: form["lifecycle"] = opts.lifecycle
        if opts.meta:      form["meta"] = json.dumps(opts.meta)

        res = self._http.post("/upload", data=form, files=files)
        return Pin.model_validate(_ok(res))

    def pin_cid(self, cid: str, opts: Optional[PinOptions] = None) -> Pin:
        opts = opts or PinOptions()
        res = self._http.post("/pins", json={"cid": cid, **opts.model_dump(exclude_none=True)})
        return Pin.model_validate(_ok(res))

    def get(self, cid: str, *, verify: bool = False, range_: Optional[tuple[int, int]] = None) -> bytes:
        headers = dict(self._auth_headers())
        if range_: headers["Range"] = f"bytes={range_[0]}-{range_[1]}"
        url = f"{self.gateway_url}/{cid}"
        params = {"verify": "true"} if verify else None
        res = httpx.get(url, params=params, headers=headers, timeout=self.timeout)
        _ok(res, json_=False)
        if verify and res.headers.get("X-Ipfs-Verified") == "false":
            raise NDNError(502, "integrity_check_failed")
        return res.content

    def list(self, **filters: Any) -> dict[str, Any]:
        res = self._http.get("/pins", params={k: v for k, v in filters.items() if v is not None})
        return _ok(res)

    def unpin(self, pin_id: str) -> None:
        res = self._http.delete(f"/pins/{pin_id}")
        if res.status_code not in (204, 404):
            raise NDNError(res.status_code, "unpin_failed", res.text)

    # ---------- Triggers ----------

    def create_trigger(
        self,
        *,
        chain: Literal["ethereum", "polygon", "arbitrum", "base", "optimism", "avalanche", "solana"],
        contract: str,
        event: str,
        cid_field: str,
        filter: Optional[dict[str, Any]] = None,
        policy: Optional[PinOptions] = None,
    ) -> dict[str, Any]:
        body = {
            "chain": chain, "contract": contract, "event": event, "cidField": cid_field,
            "filter": filter or {}, "policy": policy.model_dump(exclude_none=True) if policy else None,
        }
        res = self._http.post("/triggers", json={k: v for k, v in body.items() if v is not None})
        return _ok(res)

    # ---------- Lifecycle ----------

    def create_lifecycle_policy(self, name: str, rules: Iterable[LifecycleRule]) -> dict[str, Any]:
        res = self._http.post(
            "/lifecycle/policies",
            json={"name": name, "rules": [r.model_dump(by_alias=True, exclude_none=True) for r in rules]},
        )
        return _ok(res)

    # ---------- Analytics ----------

    def usage(
        self,
        *,
        from_: Optional[datetime] = None,
        to: Optional[datetime] = None,
        granularity: Literal["hour", "day", "month"] = "day",
    ) -> dict[str, Any]:
        params: dict[str, str] = {"granularity": granularity}
        if from_: params["from"] = from_.isoformat()
        if to:    params["to"]   = to.isoformat()
        return _ok(self._http.get("/analytics/usage", params=params))

    # ---------- Context manager ----------

    def close(self) -> None:
        self._http.close()

    def __enter__(self) -> "NDNClient":
        return self

    def __exit__(self, *_: Any) -> None:
        self.close()


def _normalize_payload(data: Any, name: Optional[str]) -> tuple[bytes, str]:
    if isinstance(data, bytes):
        return data, name or "file"
    if isinstance(data, str):
        return data.encode("utf-8"), name or "file.txt"
    if isinstance(data, Path):
        return data.read_bytes(), name or data.name
    if hasattr(data, "read"):
        return data.read(), name or getattr(data, "name", "file")
    raise TypeError(f"unsupported payload type: {type(data)}")


def _ok(res: httpx.Response, *, json_: bool = True) -> Any:
    if res.status_code >= 400:
        try:    body = res.json()
        except Exception: body = res.text
        raise NDNError(res.status_code, (body.get("error") if isinstance(body, dict) else "request_failed"), body)
    if res.status_code == 204: return None
    return res.json() if json_ else None
