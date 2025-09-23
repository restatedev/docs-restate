async def charge(payment_info: str, payment_id: str) -> str:
    return "my id"


async def refund(payment_id: str) -> None:
    print("refunding")
