package develop

import dev.restate.sdk.annotation.Handler
import dev.restate.sdk.annotation.Service
import dev.restate.sdk.kotlin.*
import java.util.UUID

internal class SideEffects {
  suspend fun sideEffect(ctx: Context) {
    // <start_side_effect>
    val output: String = ctx.runBlock { doDbRequest() }
    // <end_side_effect>

    // <start_async_side_effect>
    val myRunFuture: DurableFuture<String> = ctx.runAsync { doSomethingSlow() }
    // <end_async_side_effect>

    val paymentClient = PaymentClient()
    val txId = ""
    val amount = 1

    val a1 = ctx.awakeable<Boolean>()
    val a2 = ctx.awakeable<Boolean>()
    val a3 = ctx.awakeable<Boolean>()

    // <start_parallel>
    val call1 = ctx.runAsync<UserData> { fetchUserData(123) }
    val call2 = ctx.runAsync<OrderHistory> { fetchOrderHistory(123) }
    val call3 = AnalyticsServiceClient.fromContext(ctx).calculateMetric(123)

    // Now wait for results as needed
    val user: UserData = call1.await()
    val orders: OrderHistory = call2.await()
    val metric: Int = call3.await()
    // <end_parallel>

    // <start_combine_all>
    listOf(a1, a2, a3).awaitAll()
    // <end_combine_all>

    // <start_combine_any>
    val resSelect =
        select {
              a1.onAwait { it }
              a2.onAwait { it }
              a3.onAwait { it }
            }
            .await()
    // <end_combine_any>

    // <start_uuid>
    val uuid: UUID = ctx.random().nextUUID()
    // <end_uuid>

    // <start_random_nb>
    val value: Int = ctx.random().nextInt()
    // <end_random_nb>
  }

  private fun doDbRequest(): String {
    return ""
  }

  private fun doSomethingSlow(): String {
    return ""
  }
}

data class UserData(val name: String, val email: String)

data class OrderHistory(val orders: List<String>)

data class Metrics(val value: Double)

private fun SideEffects.fetchOrderHistory(i: Int): OrderHistory {
  TODO("Not yet implemented")
}

private fun SideEffects.fetchUserData(i: Int): UserData {
  TODO("Not yet implemented")
}

internal class PaymentClient {
  fun call(txId: String?, amount: Int): Boolean {
    return true
  }
}

@Service
class AnalyticsService {
  @Handler
  suspend fun calculateMetric(ctx: Context, metric: Int): Int {
    return 500
  }
}
