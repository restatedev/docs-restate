// Stand-ins for external APIs, like the tutorial's fakes.ts.
// Replace these with your application APIs when using the examples.
export async function fetchUser(id: string) {
  return { id, name: `User ${id}` };
}

export async function fetchOrders(userId: string) {
  return [{ id: `order-${userId}`, userId }];
}

// Stand-in for an external audit service.
export async function recordAudit(
  requestId: string,
  userId: string
): Promise<void> {
  console.log({ requestId, userId });
}
