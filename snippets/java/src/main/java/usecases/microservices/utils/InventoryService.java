package usecases.microservices.utils;

import dev.restate.sdk.Context;
import dev.restate.sdk.annotation.Handler;
import dev.restate.sdk.annotation.Service;

@Service
class InventoryService {
  public static class StockResult {
    public String item;
    public boolean inStock;

    public StockResult(String item, boolean inStock) {
      this.item = item;
      this.inStock = inStock;
    }
  }

  @Handler
  public InventoryService.StockResult checkStock(Context ctx, String item) {
    // Simulate stock check
    return new InventoryService.StockResult(item, true);
  }
}
