package usecases.workflows.utils;

import static usecases.workflows.utils.DomainModels.*;

public final class OrderUtils {

  public static void checkForFraud(Order order) {
    // Simulate fraud check
  }

  public static boolean chargePayment(Order order) {
    // Simulate payment processing
    return true;
  }

  public static boolean reserveInventory(Order order) {
    // Simulate inventory reservation
    return true;
  }
}
