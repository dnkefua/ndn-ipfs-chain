"""LangChain-compatible long-term memory backed by NDN IPFS Chain.

Each memory write produces a CID; the agent's on-chain 'AgentID' pin points
to the current memory root, allowing forks, rollback, and public audit of
agent behaviour.
"""
from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any, Optional

from ndn_ipfs import NDNClient, PinOptions


@dataclass
class NDNMemory:
    client: NDNClient
    agent_id: str
    head_cid: Optional[str] = None  # CID of the most recent memory manifest

    def save_turn(self, user: str, assistant: str, meta: Optional[dict[str, Any]] = None) -> str:
        turn = {
            "agentId": self.agent_id,
            "parent": self.head_cid,
            "user": user,
            "assistant": assistant,
            "meta": meta or {},
        }
        pin = self.client.pin(json.dumps(turn).encode("utf-8"),
                              PinOptions(name=f"{self.agent_id}/turn",
                                         meta={"kind": "turn"}))
        self.head_cid = pin.cid
        return pin.cid

    def history(self, limit: int = 10) -> list[dict[str, Any]]:
        out: list[dict[str, Any]] = []
        cur = self.head_cid
        while cur and len(out) < limit:
            turn = json.loads(self.client.get(cur, verify=True))
            out.append(turn)
            cur = turn.get("parent")
        return list(reversed(out))

    def branch(self, new_agent_id: str) -> "NDNMemory":
        """Fork: creates a sibling memory chain starting from this head."""
        return NDNMemory(self.client, new_agent_id, self.head_cid)
