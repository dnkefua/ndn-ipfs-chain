# NDN IPFS Chain Go SDK

Idiomatic Go client library and CLI for the NDN IPFS Chain API.

## Installation

```bash
go get github.com/dnkefua/ndn-ipfs-chain/sdks/go
```

## Quick Start

### As a Library

```go
package main

import (
	"context"
	ndn "github.com/dnkefua/ndn-ipfs-chain/sdks/go"
)

func main() {
	client := ndn.NewClient("https://api.ndnipfs.link/v1", "your-api-key")

	// Pin a CID
	pin, err := client.PinCID(context.Background(), "QmXxxx", &ndn.PinOptions{
		Name:        "my-content",
		Replication: 3,
		Encryption:  true,
	})
	if err != nil {
		panic(err)
	}
	println("Pinned:", pin.CID)

	// List pins
	pins, err := client.ListPins(context.Background(), 100, 0)
	if err != nil {
		panic(err)
	}
	println("Total pins:", len(pins))

	// Get usage
	usage, err := client.GetUsage(context.Background(), 30)
	if err != nil {
		panic(err)
	}
	println("Bandwidth:", usage.Bandwidth)
}
```

### As a CLI

```bash
# Set your API key
export NDN_API_KEY=ndn_live_xxxx

# Pin a CID
ndn pin cid QmXxxx --name "my-content" --replication 3

# Pin a file
ndn pin file ./data.bin --encrypt

# List pins
ndn ls

# Get pin details
ndn get QmXxxx

# Get usage metrics
ndn usage --days 30

# Remove a pin
ndn unpin QmXxxx
```

## Features

- **Pin Management**: Add, list, and remove content pins
- **File Upload**: Stream large files with resumable upload
- **Encryption**: AES-256-GCM envelope encryption
- **Analytics**: Bandwidth, request count, storage metrics
- **Lifecycle Policies**: Automatic tier transitions
- **Multi-Region**: Region-specific pin placement
- **Replication Control**: Configure redundancy per pin

## API Key Management

Generate an API key in the NDN dashboard or via the API:

```go
// Using JWT token
client := ndn.NewClientWithJWT("https://api.ndnipfs.link/v1", "jwt-token")
```

## Docs

Full API documentation: https://ndnipfs.link/docs
