package usecases.microservices.utils;

public class OrderResult {
    public boolean success;
    public String paymentId;

    public OrderResult(boolean success, String paymentId) {
        this.success = success;
        this.paymentId = paymentId;
    }
}
