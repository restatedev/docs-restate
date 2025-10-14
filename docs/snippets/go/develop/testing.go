package main

import (
	"log/slog"
	"testing"
	"time"

	"github.com/google/uuid"
	restate "github.com/restatedev/sdk-go"
	"github.com/restatedev/sdk-go/mocks"
	"github.com/stretchr/testify/assert"
)

// <start_imports>
import (
	"testing"

	restate "github.com/restatedev/sdk-go"
	"github.com/restatedev/sdk-go/mocks"
	"github.com/stretchr/testify/assert"
)

// <end_imports>

// <start_mock_context>
func TestMyHandler(t *testing.T) {
	mockCtx := mocks.NewMockContext(t)

	// Set up expectations...

	// Call your handler
	result, err := myHandler(restate.WithMockContext(mockCtx), input)

	// Assert results
	assert.NoError(t, err)
	assert.Equal(t, expected, result)
}

// <end_mock_context>

// <start_state_get>
// Mock getting state
mockCtx.EXPECT().GetAndReturn("status", TicketAvailable)

// <end_state_get>

// <start_state_set>
// Mock setting state
mockCtx.EXPECT().Set("status", TicketReserved)

// <end_state_set>

// <start_state_clear>
// Mock clearing state
mockCtx.EXPECT().Clear("status")

// <end_state_clear>

// <start_state_clear_all>
// Mock clearing all state
mockCtx.EXPECT().ClearAll()

// <end_state_clear_all>

// <start_service_call>
// Mock a service call
mockCtx.EXPECT().MockObjectClient(TicketServiceName, "ticket-123", "Reserve").
	RequestAndReturn("userID", true, nil)

// <end_service_call>

// <start_one_way_call>
// Mock a one-way call (send)
mockCtx.EXPECT().MockObjectClient(TicketServiceName, "ticket-123", "Unreserve").
	MockSend(restate.Void{})

// <end_one_way_call>

// <start_delayed_call>
// Mock a delayed call
mockCtx.EXPECT().MockObjectClient(UserSessionServiceName, "userID", "ExpireTicket").
	MockSend("ticket-123", restate.WithDelay(15*time.Minute))

// <end_delayed_call>

// <start_side_effect>
mockCtx.EXPECT().RunAndExpect(mockCtx, true, nil)

// <end_side_effect>

// <start_random>
mockCtx.EXPECT().MockRand().UUID().Return(uuid.Max)

// <end_random>

// <start_logging>
mockCtx.EXPECT().Log().Return(slog.Default())

// <end_logging>

// <start_context_key>
mockCtx.EXPECT().Key().Return("my-key")

// <end_context_key>

// <start_workflow_test>
func TestCheckout(t *testing.T) {
	mockCtx := mocks.NewMockContext(t)

	mockCtx.EXPECT().Key().Return("userID")
	mockCtx.EXPECT().GetAndReturn("tickets", []string{"ticket1"})
	mockCtx.EXPECT().Log().Return(slog.Default())

	// Mock a timer
	mockAfter := mockCtx.EXPECT().MockAfter(time.Minute)

	// Mock a service call that returns a future
	mockResponseFuture := mockCtx.EXPECT().MockObjectClient(CheckoutServiceName, "", "Payment").
		MockResponseFuture(PaymentRequest{UserID: "userID", Tickets: []string{"ticket1"}})

	// Mock selecting between futures
	mockCtx.EXPECT().MockSelector(mockAfter, mockResponseFuture).
		Select().Return(mockResponseFuture)

	// Mock the response
	mockResponseFuture.EXPECT().ResponseAndReturn(PaymentResponse{ID: "paymentID", Price: 30}, nil)

	// Continue with other expectations...
	mockCtx.EXPECT().MockObjectClient(TicketServiceName, "ticket1", "MarkAsSold").MockSend(restate.Void{})
	mockCtx.EXPECT().Clear("tickets")

	ok, err := (&userSession{}).Checkout(restate.WithMockContext(mockCtx), restate.Void{})
	assert.NoError(t, err)
	assert.True(t, ok)
}

// <end_workflow_test>

// <start_complete_example>
func TestReserve(t *testing.T) {
	mockCtx := mocks.NewMockContext(t)

	// Set up expectations
	mockCtx.EXPECT().GetAndReturn("status", TicketAvailable)
	mockCtx.EXPECT().Set("status", TicketReserved)

	// Call the handler
	ok, err := (&ticketService{}).Reserve(restate.WithMockContext(mockCtx), restate.Void{})

	// Assert results
	assert.NoError(t, err)
	assert.True(t, ok)
}

// <end_complete_example>
