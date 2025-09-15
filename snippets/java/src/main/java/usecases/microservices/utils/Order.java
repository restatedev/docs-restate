package usecases.microservices.utils;

import java.util.List;

public class Order {
  public String id;
  public List<Item> items;
  public String creditCard;

  public static class Item {
    public String id;
    public int quantity;
  }
}
