# LangChain-style agent memory on NDN IPFS Chain

A drop-in long-term memory that:
- Is content-addressed (every turn has a CID).
- Supports forking (branch an agent, replay from a checkpoint).
- Creates a public, verifiable audit trail of every decision.
- Can be encrypted with a single SDK flag for sensitive workloads.

## Install
```bash
pip install ndn-ipfs langchain
```

## Usage
```python
from ndn_ipfs import NDNClient
from memory import NDNMemory

ipfs = NDNClient(api_key=os.environ["NDN_API_KEY"])
mem = NDNMemory(ipfs, agent_id="alice-v1")

cid = mem.save_turn("Hello", "Hi, how can I help?")
for turn in mem.history(): print(turn)

# Fork into a new personality from the same history
bob = mem.branch("bob-v1")
```

## Why this matters
This is the exact pattern the `implementations/AI_Agents/` spec calls for — an immutable, branchable memory for autonomous agents. It's also a *grant-worthy* IPFS use case: it measurably increases CID creation and Filecoin deals.
