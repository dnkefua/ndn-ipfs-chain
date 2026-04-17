package ndn

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"time"
)

// Client is the NDN IPFS API client.
type Client struct {
	baseURL   string
	apiKey    string
	jwtToken  string
	httpClient *http.Client
}

// NewClient creates a new NDN IPFS client with an API key.
func NewClient(baseURL, apiKey string) *Client {
	if baseURL == "" {
		baseURL = "https://api.ndnipfs.link/v1"
	}
	return &Client{
		baseURL:   baseURL,
		apiKey:    apiKey,
		httpClient: &http.Client{Timeout: 30 * time.Second},
	}
}

// NewClientWithJWT creates a new NDN IPFS client with a JWT token.
func NewClientWithJWT(baseURL, jwtToken string) *Client {
	if baseURL == "" {
		baseURL = "https://api.ndnipfs.link/v1"
	}
	return &Client{
		baseURL:   baseURL,
		jwtToken:  jwtToken,
		httpClient: &http.Client{Timeout: 30 * time.Second},
	}
}

// Pin represents a pinned CID.
type Pin struct {
	ID          string    `json:"id,omitempty"`
	CID         string    `json:"cid"`
	Name        string    `json:"name"`
	Status      string    `json:"status"`
	Size        int64     `json:"size,omitempty"`
	Region      string    `json:"region,omitempty"`
	Replication int       `json:"replication,omitempty"`
	Encryption  bool      `json:"encryption,omitempty"`
	Tier        string    `json:"tier,omitempty"`
	Created     time.Time `json:"created,omitempty"`
}

// PinOptions defines options when pinning content.
type PinOptions struct {
	Name        string                 `json:"name,omitempty"`
	Region      string                 `json:"region,omitempty"`
	Replication int                    `json:"replication,omitempty"`
	Encryption  bool                   `json:"encryption,omitempty"`
	Lifecycle   *LifecyclePolicy       `json:"lifecycle,omitempty"`
	Meta        map[string]interface{} `json:"meta,omitempty"`
}

// PinCID pins a CID to the NDN network.
func (c *Client) PinCID(ctx context.Context, cid string, opts *PinOptions) (*Pin, error) {
	if opts == nil {
		opts = &PinOptions{}
	}
	if opts.Name == "" {
		opts.Name = cid[:12]
	}
	if opts.Replication == 0 {
		opts.Replication = 3
	}

	body, _ := json.Marshal(map[string]interface{}{
		"cid":         cid,
		"name":        opts.Name,
		"region":      opts.Region,
		"replication": opts.Replication,
		"encryption":  opts.Encryption,
		"lifecycle":   opts.Lifecycle,
		"meta":        opts.Meta,
	})

	req, _ := http.NewRequestWithContext(ctx, "POST", fmt.Sprintf("%s/pins", c.baseURL), bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	c.setAuthHeader(req)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("pin failed: status %d", resp.StatusCode)
	}

	var pin Pin
	json.NewDecoder(resp.Body).Decode(&pin)
	return &pin, nil
}

// PinFile pins a file to the NDN network.
func (c *Client) PinFile(ctx context.Context, filename string, reader io.Reader, opts *PinOptions) (*Pin, error) {
	if opts == nil {
		opts = &PinOptions{}
	}
	if opts.Name == "" {
		opts.Name = filename
	}

	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)

	file, _ := writer.CreateFormFile("file", filename)
	io.Copy(file, reader)

	writer.WriteField("name", opts.Name)
	if opts.Region != "" {
		writer.WriteField("region", opts.Region)
	}
	if opts.Replication > 0 {
		writer.WriteField("replication", fmt.Sprintf("%d", opts.Replication))
	}
	writer.WriteField("encryption", fmt.Sprintf("%v", opts.Encryption))
	writer.Close()

	req, _ := http.NewRequestWithContext(ctx, "POST", fmt.Sprintf("%s/pins", c.baseURL), body)
	req.Header.Set("Content-Type", writer.FormDataContentType())
	c.setAuthHeader(req)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("pin failed: status %d", resp.StatusCode)
	}

	var pin Pin
	json.NewDecoder(resp.Body).Decode(&pin)
	return &pin, nil
}

// GetPin retrieves pin details by CID.
func (c *Client) GetPin(ctx context.Context, cid string) (*Pin, error) {
	req, _ := http.NewRequestWithContext(ctx, "GET", fmt.Sprintf("%s/pins/%s", c.baseURL, cid), nil)
	c.setAuthHeader(req)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("get pin failed: status %d", resp.StatusCode)
	}

	var pin Pin
	json.NewDecoder(resp.Body).Decode(&pin)
	return &pin, nil
}

// ListPins lists all pins for the authenticated user.
func (c *Client) ListPins(ctx context.Context, limit, offset int) ([]Pin, error) {
	if limit == 0 {
		limit = 100
	}

	url := fmt.Sprintf("%s/pins?limit=%d&offset=%d", c.baseURL, limit, offset)
	req, _ := http.NewRequestWithContext(ctx, "GET", url, nil)
	c.setAuthHeader(req)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("list pins failed: status %d", resp.StatusCode)
	}

	var result struct {
		Pins []Pin `json:"pins"`
	}
	json.NewDecoder(resp.Body).Decode(&result)
	return result.Pins, nil
}

// UnpinCID removes a pin from the network.
func (c *Client) UnpinCID(ctx context.Context, cid string) error {
	req, _ := http.NewRequestWithContext(ctx, "DELETE", fmt.Sprintf("%s/pins/%s", c.baseURL, cid), nil)
	c.setAuthHeader(req)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		return fmt.Errorf("unpin failed: status %d", resp.StatusCode)
	}
	return nil
}

// Usage represents bandwidth and request metrics.
type Usage struct {
	Bandwidth int64                  `json:"bandwidth"`
	Requests  int64                  `json:"requests"`
	Storage   int64                  `json:"storage"`
	ByTier    map[string]interface{} `json:"by_tier,omitempty"`
}

// GetUsage retrieves usage metrics for the last N days.
func (c *Client) GetUsage(ctx context.Context, days int) (*Usage, error) {
	if days == 0 {
		days = 30
	}

	url := fmt.Sprintf("%s/analytics/usage?days=%d", c.baseURL, days)
	req, _ := http.NewRequestWithContext(ctx, "GET", url, nil)
	c.setAuthHeader(req)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("get usage failed: status %d", resp.StatusCode)
	}

	var usage Usage
	json.NewDecoder(resp.Body).Decode(&usage)
	return &usage, nil
}

// LifecyclePolicy defines when content transitions between storage tiers.
type LifecyclePolicy struct {
	ID       string    `json:"id,omitempty"`
	Name     string    `json:"name"`
	Rules    []Rule    `json:"rules"`
	Created  time.Time `json:"created,omitempty"`
}

// Rule defines a single lifecycle transition.
type Rule struct {
	Days      int    `json:"days"`
	FromTier  string `json:"from_tier"`
	ToTier    string `json:"to_tier"`
	Action    string `json:"action"` // "move", "copy", "delete"
}

// CreateLifecyclePolicy creates a new lifecycle policy.
func (c *Client) CreateLifecyclePolicy(ctx context.Context, policy *LifecyclePolicy) (*LifecyclePolicy, error) {
	body, _ := json.Marshal(policy)
	req, _ := http.NewRequestWithContext(ctx, "POST", fmt.Sprintf("%s/lifecycle/policies", c.baseURL), bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	c.setAuthHeader(req)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("create policy failed: status %d", resp.StatusCode)
	}

	var result LifecyclePolicy
	json.NewDecoder(resp.Body).Decode(&result)
	return &result, nil
}

// setAuthHeader adds authentication headers to the request.
func (c *Client) setAuthHeader(req *http.Request) {
	if c.apiKey != "" {
		req.Header.Set("X-API-Key", c.apiKey)
	} else if c.jwtToken != "" {
		req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", c.jwtToken))
	}
}
