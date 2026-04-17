# ndn-ipfs

> The easiest way to build on IPFS from Python. Pin, retrieve, encrypt, and automate.

## Install
```bash
pip install ndn-ipfs
```

## Quick start
```python
from ndn_ipfs import NDNClient, PinOptions

ipfs = NDNClient(api_key="ndn_live_...")

pin = ipfs.pin(b"Hello, IPFS", PinOptions(name="hello.txt", region="us-east-1"))
print(pin.cid)

data = ipfs.get(pin.cid, verify=True)
```

## Client-side encryption
```python
pin = ipfs.pin(open("model.safetensors", "rb"), PinOptions(encryption=True))
# NDN never sees plaintext; the CID addresses ciphertext.
```

## Lifecycle policy
```python
from ndn_ipfs import LifecycleRule

ipfs.create_lifecycle_policy("ml-7yr", [
    LifecycleRule(action="move-to-cold",     afterDays=30),
    LifecycleRule(action="move-to-filecoin", afterDays=90),
])
```

## Smart-contract trigger
```python
ipfs.create_trigger(
    chain="polygon",
    contract="0xProvenance...",
    event="BatchRecorded(bytes32,string)",
    cid_field="1",
    policy=PinOptions(replication=5, region="eu-central-1"),
)
```

Docs: https://docs.ndnipfs.com/python
