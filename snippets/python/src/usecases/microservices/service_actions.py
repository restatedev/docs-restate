from typing import List, Dict, Any

import restate
from datetime import timedelta
import asyncio


class PaymentResult:
    pass


class Order:
    def __init__(self, id: str, items: List[Dict[str, Any]], credit_card: str):
        self.id = id
        self.items = items
        self.credit_card = credit_card


def start_payment(order: Order, confirmation_id: str):
    # Simulate starting payment with awakeable ID
    pass


def process_item(item: dict):
    # Simulate item processing
    pass


my_service = restate.Service("MyService")


@my_service.handler()
async def process(ctx: restate.Context, ticket: Order):
    req = "item-123"

    # <start_communication>
    # Request-response: Wait for result
    result = await ctx.service_call(charge_payment, req)

    # Fire-and-forget: Guaranteed delivery without waiting
    ctx.service_send(send_ticket_email, ticket)

    # Delayed execution: Schedule for later
    ctx.service_send(send_reminder, ticket, send_delay=timedelta(days=7))
    # <end_communication>


inventory_service = restate.Service("InventoryService")


@inventory_service.handler()
async def charge_payment(ctx: restate.Context, item: str):
    # Simulate stock check
    return {"item": item, "in_stock": True}


email_service = restate.Service("EmailService")


@email_service.handler()
async def send_ticket_email(ctx: restate.Context, order: Order):
    # Simulate sending email
    print(f"Sending confirmation for order {order.id}")


reminder_service = restate.Service("ReminderService")


@reminder_service.handler()
async def send_reminder(ctx: restate.Context, order: Order):
    # Simulate sending reminder
    print(f"Sending reminder for order {order.id}")
