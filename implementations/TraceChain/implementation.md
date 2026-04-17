# IPFS Implementation: TraceChain
## Context
Integration of NDN IPFS Chain into the TraceChain pharmaceutical provenance system.

## Implementation Scaffolding
### 1. Metadata Storage Flow
- **Event Trigger:** When `ProvenanceRegistry.sol` records a batch creation, the API triggers an upload to NDN IPFS Chain.
- **Content:** Product passports, batch certificates, and temperature logs.
- **CID Storage:** The resulting CID is stored on-chain in the `ProductPassport` NFT metadata.

### 2. Integration Requirements
- **API Endpoint:** `POST /api/v1/pin` $\rightarrow$ Returns CID.
- **Gateway:** Use a dedicated pharmaceutical gateway for low-latency access to batch documents.
- **Security:** Use Private Swarm for sensitive patient/batch data.

### 3. Data Model
- `batch_metadata.json`: { "batchId": "...", "manufacturer": "...", "expiry": "...", "certification_url": "ipfs://..." }
