package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"strconv"

	ndn "github.com/dnkefua/ndn-ipfs-chain/sdks/go"
	"github.com/urfave/cli/v2"
)

func getClient(c *cli.Context) *ndn.Client {
	apiKey := os.Getenv("NDN_API_KEY")
	if apiKey == "" {
		apiKey = c.String("key")
	}

	baseURL := os.Getenv("NDN_API_URL")
	if baseURL == "" {
		baseURL = "https://api.ndnipfs.link/v1"
	}

	if apiKey == "" {
		log.Fatal("Please set NDN_API_KEY or use --key flag")
	}

	return ndn.NewClient(baseURL, apiKey)
}

func main() {
	app := &cli.App{
		Name:  "ndn",
		Usage: "NDN IPFS Chain CLI",
		Flags: []cli.Flag{
			&cli.StringFlag{
				Name:    "key",
				Usage:   "API key (or set NDN_API_KEY env var)",
				EnvVars: []string{"NDN_API_KEY"},
			},
		},
		Commands: []*cli.Command{
			{
				Name:  "pin",
				Usage: "Pin a CID or file",
				Subcommands: []*cli.Command{
					{
						Name:      "cid",
						Usage:     "Pin an existing CID",
						ArgsUsage: "CID",
						Flags: []cli.Flag{
							&cli.StringFlag{Name: "name", Usage: "Pin name"},
							&cli.StringFlag{Name: "region", Usage: "Region (us-west, eu, ap)"},
							&cli.IntFlag{Name: "replication", Value: 3, Usage: "Replication factor"},
							&cli.BoolFlag{Name: "encrypt", Usage: "Enable encryption"},
						},
						Action: func(c *cli.Context) error {
							if c.NArg() == 0 {
								return fmt.Errorf("CID required")
							}
							cid := c.Args().Get(0)

							client := getClient(c)
							opts := &ndn.PinOptions{
								Name:        c.String("name"),
								Region:      c.String("region"),
								Replication: c.Int("replication"),
								Encryption:  c.Bool("encrypt"),
							}

							pin, err := client.PinCID(context.Background(), cid, opts)
							if err != nil {
								return err
							}

							fmt.Printf("Pinned: %s (%s)\n", pin.CID, pin.Status)
							return nil
						},
					},
					{
						Name:      "file",
						Usage:     "Pin a file",
						ArgsUsage: "FILE",
						Flags: []cli.Flag{
							&cli.StringFlag{Name: "name", Usage: "Pin name"},
							&cli.StringFlag{Name: "region", Usage: "Region"},
							&cli.IntFlag{Name: "replication", Value: 3, Usage: "Replication factor"},
							&cli.BoolFlag{Name: "encrypt", Usage: "Enable encryption"},
						},
						Action: func(c *cli.Context) error {
							if c.NArg() == 0 {
								return fmt.Errorf("file path required")
							}

							file, err := os.Open(c.Args().Get(0))
							if err != nil {
								return err
							}
							defer file.Close()

							client := getClient(c)
							info, _ := file.Stat()
							opts := &ndn.PinOptions{
								Name:        c.String("name"),
								Region:      c.String("region"),
								Replication: c.Int("replication"),
								Encryption:  c.Bool("encrypt"),
							}
							if opts.Name == "" {
								opts.Name = info.Name()
							}

							pin, err := client.PinFile(context.Background(), info.Name(), file, opts)
							if err != nil {
								return err
							}

							fmt.Printf("Pinned: %s (%s)\n", pin.CID, pin.Status)
							return nil
						},
					},
				},
			},
			{
				Name:      "unpin",
				Usage:     "Remove a pin",
				ArgsUsage: "CID",
				Action: func(c *cli.Context) error {
					if c.NArg() == 0 {
						return fmt.Errorf("CID required")
					}

					client := getClient(c)
					err := client.UnpinCID(context.Background(), c.Args().Get(0))
					if err != nil {
						return err
					}

					fmt.Println("Unpinned")
					return nil
				},
			},
			{
				Name:  "ls",
				Usage: "List pins",
				Flags: []cli.Flag{
					&cli.IntFlag{Name: "limit", Value: 100, Usage: "Results limit"},
					&cli.IntFlag{Name: "offset", Usage: "Results offset"},
				},
				Action: func(c *cli.Context) error {
					client := getClient(c)
					pins, err := client.ListPins(context.Background(), c.Int("limit"), c.Int("offset"))
					if err != nil {
						return err
					}

					fmt.Println("CID\t\t\t\t\tName\t\tStatus\t\tSize")
					for _, pin := range pins {
						size := "—"
						if pin.Size > 0 {
							size = fmt.Sprintf("%.2f MB", float64(pin.Size)/1024/1024)
						}
						fmt.Printf("%s\t%s\t%s\t%s\n", pin.CID[:16], pin.Name, pin.Status, size)
					}
					return nil
				},
			},
			{
				Name:      "get",
				Usage:     "Get pin info",
				ArgsUsage: "CID",
				Action: func(c *cli.Context) error {
					if c.NArg() == 0 {
						return fmt.Errorf("CID required")
					}

					client := getClient(c)
					pin, err := client.GetPin(context.Background(), c.Args().Get(0))
					if err != nil {
						return err
					}

					fmt.Printf("CID: %s\n", pin.CID)
					fmt.Printf("Name: %s\n", pin.Name)
					fmt.Printf("Status: %s\n", pin.Status)
					fmt.Printf("Size: %.2f MB\n", float64(pin.Size)/1024/1024)
					fmt.Printf("Region: %s\n", pin.Region)
					fmt.Printf("Replication: %d\n", pin.Replication)
					fmt.Printf("Encryption: %v\n", pin.Encryption)
					fmt.Printf("Created: %s\n", pin.Created.Format("2006-01-02 15:04:05"))
					return nil
				},
			},
			{
				Name:  "usage",
				Usage: "Get usage metrics",
				Flags: []cli.Flag{
					&cli.IntFlag{Name: "days", Value: 30, Usage: "Days to report"},
				},
				Action: func(c *cli.Context) error {
					client := getClient(c)
					usage, err := client.GetUsage(context.Background(), c.Int("days"))
					if err != nil {
						return err
					}

					fmt.Printf("Bandwidth: %.2f GB\n", float64(usage.Bandwidth)/1024/1024/1024)
					fmt.Printf("Requests: %d\n", usage.Requests)
					fmt.Printf("Storage: %.2f GB\n", float64(usage.Storage)/1024/1024/1024)
					return nil
				},
			},
		},
	}

	if err := app.Run(os.Args); err != nil {
		log.Fatal(err)
	}
}
