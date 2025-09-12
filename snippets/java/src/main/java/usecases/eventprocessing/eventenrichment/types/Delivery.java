package usecases.eventprocessing.eventenrichment.types;

import java.util.ArrayList;
import java.util.List;

public class Delivery {
  private String finalDestination;
  private List<Location> locations = new ArrayList<>();

  public Delivery(String finalDestination) {
    this.finalDestination = finalDestination;
  }

  public String getFinalDestination() {
    return finalDestination;
  }

  public void setFinalDestination(String finalDestination) {
    this.finalDestination = finalDestination;
  }

  public List<Location> getLocations() {
    return locations;
  }

  public void setLocations(List<Location> locations) {
    this.locations = locations;
  }

  public void addLocation(Location locationUpdate) {
    this.locations.add(locationUpdate);
  }
}
