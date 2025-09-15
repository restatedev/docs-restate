package usecases.workflows.utils;

import java.util.Optional;

public final class DomainModels {

  public static class User {
    public String name;
    public String email;
  }

  public static class Order {
    public String id;
    public int amount;
  }

  public static class OrderDetails {
    public String id;
    public int amount;

    public OrderDetails(String id, int amount) {
      this.id = id;
      this.amount = amount;
    }
  }

  public static class PaymentResult {
    public boolean success;

    public PaymentResult(boolean success) {
      this.success = success;
    }
  }

  public static class InventoryResult {
    public boolean success;

    public InventoryResult(boolean success) {
      this.success = success;
    }
  }

  public static class ProcessingResult {
    public boolean success;

    public ProcessingResult(boolean success) {
      this.success = success;
    }
  }

  public static class CreateUserRequest {
    public String userId;
    public User user;

    public CreateUserRequest(String userId, User user) {
      this.userId = userId;
      this.user = user;
    }
  }

  public static class SignupResult {
    public boolean success;

    public SignupResult(boolean success) {
      this.success = success;
    }
  }

  public record OrderStatus(Optional<String> payment, Optional<OrderDetails> order) {}
}
