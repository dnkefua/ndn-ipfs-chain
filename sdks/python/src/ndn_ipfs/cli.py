"""`ndn` command-line tool.

Examples:
    ndn auth login --api-key $NDN_API_KEY
    ndn pin file.mp4 --region us-east-1 --encrypt
    ndn get bafybei...   --verify -o out.mp4
    ndn ls --status pinned
    ndn trigger add --chain polygon --contract 0x... --event 'BatchRecorded(bytes32,string)' --cid-field 1
    ndn lifecycle create compliance-7yr --rule 'move-to-cold:30' --rule 'move-to-filecoin:90'
    ndn usage --from 2026-01-01 --granularity month
"""
from __future__ import annotations

import json
import os
import sys
from pathlib import Path
from typing import Optional

import typer
from rich import print
from rich.table import Table

from .client import NDNClient, PinOptions, LifecycleRule

app = typer.Typer(add_completion=False, help="NDN IPFS Chain CLI")
auth_app = typer.Typer(help="Manage authentication")
trigger_app = typer.Typer(help="Smart-contract pin triggers")
lifecycle_app = typer.Typer(help="Lifecycle policies")
app.add_typer(auth_app, name="auth")
app.add_typer(trigger_app, name="trigger")
app.add_typer(lifecycle_app, name="lifecycle")

CONFIG_PATH = Path.home() / ".ndn" / "config.json"


def _client() -> NDNClient:
    api_key = os.environ.get("NDN_API_KEY")
    base_url = os.environ.get("NDN_BASE_URL", "https://api.ndnipfs.com/v1")
    if not api_key and CONFIG_PATH.exists():
        cfg = json.loads(CONFIG_PATH.read_text())
        api_key = cfg.get("api_key")
        base_url = cfg.get("base_url", base_url)
    if not api_key:
        print("[red]No API key. Run `ndn auth login --api-key …` or set NDN_API_KEY.[/red]")
        raise typer.Exit(1)
    return NDNClient(api_key=api_key, base_url=base_url)


@auth_app.command("login")
def login(api_key: str = typer.Option(..., "--api-key"), base_url: Optional[str] = None) -> None:
    """Save an API key locally."""
    CONFIG_PATH.parent.mkdir(parents=True, exist_ok=True)
    cfg = {"api_key": api_key}
    if base_url: cfg["base_url"] = base_url
    CONFIG_PATH.write_text(json.dumps(cfg, indent=2))
    CONFIG_PATH.chmod(0o600)
    print(f"[green]Saved credentials to {CONFIG_PATH}[/green]")


@auth_app.command("logout")
def logout() -> None:
    if CONFIG_PATH.exists(): CONFIG_PATH.unlink()
    print("[green]Logged out.[/green]")


@app.command()
def pin(
    path: Path,
    name: Optional[str] = None,
    region: Optional[str] = typer.Option(None, "--region"),
    replication: int = 3,
    encrypt: bool = typer.Option(False, "--encrypt"),
    lifecycle: Optional[str] = None,
) -> None:
    """Upload + pin a file."""
    with _client() as ipfs:
        result = ipfs.pin(
            path,
            PinOptions(name=name or path.name, region=region, replication=replication,
                       encryption=encrypt, lifecycle=lifecycle),
        )
        print(f"[green]pinned[/green] {result.cid}  ({result.size or '?'} bytes)")
        print(f"  gateway: {ipfs.gateway_url}/{result.cid}")


@app.command()
def get(
    cid: str,
    output: Optional[Path] = typer.Option(None, "-o", "--output"),
    verify: bool = typer.Option(False, "--verify"),
) -> None:
    with _client() as ipfs:
        data = ipfs.get(cid, verify=verify)
        if output:
            output.write_bytes(data)
            print(f"[green]wrote {len(data)} bytes → {output}[/green]")
        else:
            sys.stdout.buffer.write(data)


@app.command("ls")
def ls(
    status: Optional[str] = typer.Option(None, "--status"),
    cid: Optional[str] = None,
    name: Optional[str] = None,
    limit: int = 100,
) -> None:
    with _client() as ipfs:
        page = ipfs.list(status=status, cid=cid, name=name, limit=limit)
        t = Table(title=f"Pins ({page['count']})")
        for col in ("CID", "Name", "Status", "Size", "Created"): t.add_column(col)
        for p in page["results"]:
            t.add_row(p["cid"][:16] + "…", p.get("name") or "", p["status"], str(p.get("size") or ""), p["created"])
        print(t)


@app.command()
def unpin(pin_id: str) -> None:
    with _client() as ipfs:
        ipfs.unpin(pin_id)
    print(f"[yellow]unpinned {pin_id}[/yellow]")


@app.command()
def usage(
    granularity: str = typer.Option("day", "--granularity"),
) -> None:
    with _client() as ipfs:
        u = ipfs.usage(granularity=granularity)
    print(json.dumps(u, indent=2, default=str))


@trigger_app.command("add")
def trigger_add(
    chain: str = typer.Option(..., "--chain"),
    contract: str = typer.Option(..., "--contract"),
    event: str = typer.Option(..., "--event"),
    cid_field: str = typer.Option(..., "--cid-field"),
) -> None:
    with _client() as ipfs:
        t = ipfs.create_trigger(chain=chain, contract=contract, event=event, cid_field=cid_field)
    print(f"[green]trigger {t['id']} active[/green]")


@lifecycle_app.command("create")
def lifecycle_create(
    name: str,
    rule: list[str] = typer.Option(..., "--rule", help="action:days  (e.g. move-to-cold:30)"),
) -> None:
    rules = []
    for r in rule:
        action, days = r.split(":")
        rules.append(LifecycleRule(action=action, afterDays=int(days)))
    with _client() as ipfs:
        p = ipfs.create_lifecycle_policy(name, rules)
    print(f"[green]policy {p['id']} created[/green]")


if __name__ == "__main__":
    app()
