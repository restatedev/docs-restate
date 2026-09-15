// <start_in_process_tunnel>
package develop

import (
	"context"
	"log"
	"os"

	restate "github.com/restatedev/sdk-go"
	"github.com/restatedev/sdk-go/server"
	"github.com/restatedev/sdk-go/x/tunnel"
)

func serveWithTunnel() {
	srv := server.NewRestate().Bind(restate.Reflect(MyService{}))

	err := tunnel.NewTunnel(srv,
		tunnel.WithRegion(os.Getenv("RESTATE_CLOUD_REGION")),
		tunnel.WithEnvironment(
			os.Getenv("RESTATE_ENVIRONMENT_ID"),
			os.Getenv("RESTATE_SIGNING_PUBLIC_KEY"),
		),
		tunnel.WithAuthToken(os.Getenv("RESTATE_AUTH_TOKEN")),
		tunnel.WithTunnelName(os.Getenv("RESTATE_TUNNEL_NAME")),
	).Start(context.Background())
	if err != nil {
		log.Fatal(err)
	}
}

// <end_in_process_tunnel>
