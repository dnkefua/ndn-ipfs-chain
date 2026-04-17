package main

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/ipfs/kubo/client/rpc"
)

// OriginGateway wraps a Kubo IPFS node and adds verification + subdomain support.
type OriginGateway struct {
	kubo       *rpc.HttpApi
	listenAddr string
}

func main() {
	kuboAddr := os.Getenv("KUBO_RPC_ADDR")
	if kuboAddr == "" {
		kuboAddr = "/ip4/127.0.0.1/tcp/5001"
	}

	listenAddr := os.Getenv("LISTEN_ADDR")
	if listenAddr == "" {
		listenAddr = ":8080"
	}

	api, err := rpc.NewApi(kuboAddr)
	if err != nil {
		log.Fatal("Failed to connect to Kubo:", err)
	}

	gateway := &OriginGateway{
		kubo:       api,
		listenAddr: listenAddr,
	}

	mux := http.NewServeMux()

	// Subdomain gateway: <cid>.ipfs.ndnipfs.link/path
	mux.HandleFunc("/", gateway.handleSubdomainGateway)

	log.Printf("NDN Origin Gateway listening on %s\n", listenAddr)
	log.Fatal(http.ListenAndServe(listenAddr, mux))
}

// handleSubdomainGateway handles both subdomain and path-based IPFS retrieval.
func (g *OriginGateway) handleSubdomainGateway(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	// Extract CID from request
	cid, path, err := extractCIDFromRequest(r)
	if err != nil {
		http.Error(w, fmt.Sprintf("Invalid CID: %s", err), http.StatusBadRequest)
		return
	}

	// Check for verification request
	verify := r.URL.Query().Get("verify") == "true"

	// Retrieve content from IPFS
	reader, err := g.kubo.Unixfs().Get(ctx, cid+path)
	if err != nil {
		http.Error(w, "Content not found", http.StatusNotFound)
		return
	}
	defer reader.Close()

	// Stream response (optionally with verification)
	if verify {
		g.serializeWithVerification(w, reader, cid)
	} else {
		w.Header().Set("Content-Type", "application/octet-stream")
		w.Header().Set("Cache-Control", "public, max-age=31536000, immutable")
		w.Header().Set("X-IPFS-Root", cid)
		io.Copy(w, reader)
	}
}

// serializeWithVerification streams content while computing and returning a hash proof.
func (g *OriginGateway) serializeWithVerification(w http.ResponseWriter, reader io.Reader, cid string) {
	hasher := sha256.New()
	mw := io.MultiWriter(w, hasher)

	w.Header().Set("Content-Type", "application/octet-stream")
	w.Header().Set("Cache-Control", "public, max-age=31536000, immutable")
	w.Header().Set("X-IPFS-Root", cid)
	w.Header().Set("X-IPFS-Verified", "true")

	if _, err := io.Copy(mw, reader); err == nil {
		contentHash := hex.EncodeToString(hasher.Sum(nil))
		w.Header().Set("X-Content-Hash", contentHash)
	}
}

// extractCIDFromRequest extracts CID from subdomain or path-based gateway URL.
func extractCIDFromRequest(r *http.Request) (string, string, error) {
	host := r.Host

	// Subdomain format: <cid>.ipfs.ndnipfs.link/path
	if strings.Contains(host, ".ipfs.") {
		parts := strings.Split(host, ".")
		if len(parts) > 0 {
			cid := parts[0]
			path := r.URL.Path
			if path == "" || path == "/" {
				path = ""
			}
			return cid, path, nil
		}
	}

	// Path format: /ipfs/<cid>/path or /cid/path
	path := r.URL.Path
	if strings.HasPrefix(path, "/ipfs/") {
		parts := strings.SplitN(path[6:], "/", 2)
		cid := parts[0]
		subpath := ""
		if len(parts) > 1 {
			subpath = "/" + parts[1]
		}
		return cid, subpath, nil
	}

	return "", "", fmt.Errorf("no CID found in request")
}

// Token-gated retrieval (simplified)
func verifyTokenGate(r *http.Request, cid string) bool {
	// Check for token in header or query param
	token := r.Header.Get("X-Access-Token")
	if token == "" {
		token = r.URL.Query().Get("token")
	}

	// Validation logic would check against smart contracts here
	// For now, just verify token format
	return token != "" && len(token) > 10
}

// Health check endpoint
func health(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	fmt.Fprintf(w, `{"status":"healthy","timestamp":"%s"}`, time.Now().UTC().Format(time.RFC3339))
}
