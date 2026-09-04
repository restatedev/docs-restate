package develop

// <start_operator_in_process_tunnel>
import (
	"context"
	"log/slog"
	"os"
	"os/signal"
	"syscall"

	restate "github.com/restatedev/sdk-go"
	"github.com/restatedev/sdk-go/server"
	"github.com/restatedev/sdk-go/x/tunnel"
)

func serve() {
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	srv := server.NewRestate().
		Bind(restate.Reflect(MyService{}))

	// The Restate Operator injects the env vars for connecting to Cloud
	// Start blocks until ctx is cancelled (SIGINT/SIGTERM), then drains and closes.
	err := tunnel.NewTunnel(srv).Start(ctx)
	if err != nil {
		slog.Error("tunnel exited with error", "err", err.Error())
		os.Exit(1)
	}
}

// <end_operator_in_process_tunnel>
