package foundations.actions;

// Type definitions for examples
record UserProfile(String name, String email) {}

class ShoppingCart {}

record PaymentResult(boolean success, String transactionId) {}

record InventoryResult(boolean available, int quantity) {}

class Order {}

// Mock external functions
class ExternalAPI {
  public static String fetchData(String url) {
    return "";
  }

  public static String updateUserDatabase(String id, String data) {
    return data;
  }
}
