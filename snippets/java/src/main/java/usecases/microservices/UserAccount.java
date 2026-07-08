package usecases.microservices;

import dev.restate.sdk.Restate;
import dev.restate.sdk.annotation.Handler;
import dev.restate.sdk.annotation.Shared;
import dev.restate.sdk.annotation.VirtualObject;
import dev.restate.sdk.common.StateKey;
import dev.restate.sdk.common.TerminalException;

// <start_here>
@VirtualObject
public class UserAccount {
  private static final StateKey<Double> BALANCE = StateKey.of("balance", Double.class);

  @Handler
  public double updateBalance(double amount) {
    double balance = Restate.state().get(BALANCE).orElse(0.0);
    double newBalance = balance + amount;

    if (newBalance < 0) {
      throw new TerminalException("Insufficient funds");
    }

    Restate.state().set(BALANCE, newBalance);
    return newBalance;
  }

  @Shared
  public double getBalance() {
    return Restate.state().get(BALANCE).orElse(0.0);
  }
}
// <end_here>
