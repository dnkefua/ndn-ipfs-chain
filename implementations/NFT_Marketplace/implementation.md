# IPFS Implementation: NFT Marketplace
## Context
High-performance, permanent storage for digital assets, artwork, and metadata for a premium NFT ecosystem.

## Implementation Scaffolding
### 1. Asset Hosting
- **Multi-Resolution Storage:** Store original high-res assets, optimized thumbnails, and video previews as a single IPFS directory.
- **Metadata Standards:** Follow ERC-721/1155 standards, pinning the `json` metadata file and the referenced media in a linked structure.

### 2. Provenance & Authenticity
- **Originality Proof:** The first-time pin of an asset creates the "Genesis CID," which is used to prove the original source of the artwork.
- **Content Hash Verification:** Use the gateway to verify that the displayed asset matches the on-chain CID exactly.

### 3. Integration Requirements
- **Content Delivery:** Heavy reliance on the Global CDN layer to ensure artwork loads instantly for users worldwide.
- **Dynamic Metadata:** Implement "IPNS" (InterPlanetary Naming System) or a custom pointer system to allow metadata updates while keeping the asset immutable.
