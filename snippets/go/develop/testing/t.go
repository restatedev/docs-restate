package testing

// <start_here>
import (
	"testing"

	restate "github.com/restatedev/sdk-go"
	restateingress "github.com/restatedev/sdk-go/ingress"
	restatetest "github.com/restatedev/sdk-go/testing"
	"github.com/stretchr/testify/require"
)

func TestWithTestcontainers(t *testing.T) {
	tEnv := restatetest.Start(t, restate.Reflect(Greeter{}))
	client := tEnv.Ingress()

	out, err := restateingress.Service[string, string](client, "Greeter", "Greet").Request(t.Context(), "Francesco")
	require.NoError(t, err)
	require.Equal(t, "You said hi to Francesco!", out)
}

// <end_here>
